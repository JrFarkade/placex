import os
import time
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.resume_service.extractor.pdf_extractor import PDFExtractor
from app.resume_service.extractor.docx_extractor import DOCXExtractor
from app.resume_service.detector.document_classifier import DocumentClassifier, DocumentType
from app.resume_service.parser.resume_parser import StructuredResumeParser
from app.resume_service.ats.matcher_engine import MatcherEngine
from app.models.resume import ResumeUpload
from app.host_agent.memory.memory_manager import MemoryManager

logger = logging.getLogger("placex.resume_service")

class ResumeService:
    """
    Independent PlaceX Resume Intelligence Service.
    Handles multi-engine PDF/DOCX extraction, classification (RESUME, CV, UNKNOWN, NON_RESUME, EXTRACTION_FAILED, IMAGE_ONLY),
    Mode A / Mode B analysis, and version tracking.
    """

    @classmethod
    def process_and_analyze_resume(cls, db: Session, user_id: int, file_path: str, original_filename: str, target_jd: str = "") -> Dict[str, Any]:
        start_time = time.time()
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0

        # 1. Extract text and metadata with detailed diagnostic logging
        if original_filename.lower().endswith(".pdf"):
            ext_res = PDFExtractor.extract_text_and_info(file_path)
        else:
            ext_res = DOCXExtractor.extract_text_and_info(file_path)

        extracted_text = ext_res["text"]
        extraction_status = ext_res["status"]
        char_count = ext_res["character_count"]

        # Logging for development debugging (Step 1 requirement)
        logger.info(f"[Resume Upload Diagnostic] File: {original_filename} | Size: {file_size} bytes | Path: {file_path} | Status: {extraction_status} | Chars: {char_count}")

        # 2. Document Type Detection Layer (Executes BEFORE parsing and ATS matching)
        doc_eval = DocumentClassifier.classify_document(extracted_text, extraction_status=extraction_status)

        # Handle Failed / Image-Only / Non-Resume Rejection States
        if not doc_eval["is_valid_resume"] and doc_eval["doc_type"] != DocumentType.UNKNOWN:
            return {
                "status": "rejected",
                "doc_type": doc_eval["doc_type"],
                "confidence_score": doc_eval["confidence_score"],
                "message": doc_eval["message"],
                "red_flags": doc_eval["red_flags"],
                "extraction_info": ext_res,
                "processing_time": round(time.time() - start_time, 4)
            }

        # 3. Parse Structured Schema for valid/unknown resumes
        parsed_resume = StructuredResumeParser.parse_resume(extracted_text)

        # 4. Select Mode A (Resume Only) or Mode B (Resume + Job Description)
        has_jd = bool(target_jd and len(target_jd.strip()) > 20)
        
        if has_jd:
            analysis_result = MatcherEngine.evaluate_mode_b_job_match(parsed_resume, extracted_text, target_jd)
            ats_score = analysis_result["placex_match_score"]
        else:
            analysis_result = MatcherEngine.evaluate_mode_a_health_check(parsed_resume, extracted_text)
            ats_score = analysis_result["resume_quality_score"]

        # 5. Version History Management in Database
        existing_versions_count = db.query(ResumeUpload).filter(ResumeUpload.user_id == user_id).count()
        next_version = existing_versions_count + 1

        upload_record = ResumeUpload(
            user_id=user_id,
            original_filename=original_filename,
            stored_filename=os.path.basename(file_path),
            file_path=file_path,
            file_type="pdf" if original_filename.lower().endswith(".pdf") else "docx",
            version=next_version,
            parsed_data={
                "doc_type": doc_eval["doc_type"],
                "parsed_schema": parsed_resume,
                "analysis_result": analysis_result,
                "extraction_info": ext_res
            },
            ats_score=ats_score,
            ats_breakdown=analysis_result.get("section_scores", {})
        )
        db.add(upload_record)
        db.commit()
        db.refresh(upload_record)

        # 6. Update Host Agent Long-Term Memory
        MemoryManager.update_long_term(db, user_id, {"resume_score": ats_score})

        processing_time = round(time.time() - start_time, 4)

        return {
            "status": "success",
            "doc_type": doc_eval["doc_type"],
            "confidence_score": doc_eval["confidence_score"],
            "resume_id": upload_record.id,
            "version": next_version,
            "analysis_mode": analysis_result["analysis_mode"],
            "ats_score": ats_score,
            "parsed_resume": parsed_resume,
            "analysis_result": analysis_result,
            "message": doc_eval["message"],
            "processing_time": processing_time
        }

    @classmethod
    def get_history(cls, db: Session, user_id: int) -> List[Dict[str, Any]]:
        records = db.query(ResumeUpload).filter(ResumeUpload.user_id == user_id).order_by(ResumeUpload.uploaded_at.desc()).all()
        return [
            {
                "id": r.id,
                "version": r.version,
                "original_filename": r.original_filename,
                "ats_score": r.ats_score,
                "uploaded_at": r.uploaded_at.isoformat()
            }
            for r in records
        ]

    @classmethod
    def get_resume_by_id(cls, db: Session, user_id: int, resume_id: int) -> Optional[Dict[str, Any]]:
        record = db.query(ResumeUpload).filter(ResumeUpload.id == resume_id, ResumeUpload.user_id == user_id).first()
        if not record:
            return None
        return {
            "id": record.id,
            "version": record.version,
            "original_filename": record.original_filename,
            "ats_score": record.ats_score,
            "parsed_data": record.parsed_data,
            "uploaded_at": record.uploaded_at.isoformat()
        }

    @classmethod
    def delete_resume(cls, db: Session, user_id: int, resume_id: int) -> bool:
        record = db.query(ResumeUpload).filter(ResumeUpload.id == resume_id, ResumeUpload.user_id == user_id).first()
        if not record:
            return False
        db.delete(record)
        db.commit()
        return True
