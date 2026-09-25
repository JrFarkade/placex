import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Body
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.v1.auth import get_current_user
from app.resume_service.services.resume_service import ResumeService
from app.resume_service.detector.document_classifier import DocumentClassifier
from app.resume_service.parser.resume_parser import StructuredResumeParser
from app.resume_service.ats.matcher_engine import MatcherEngine
from app.core.config import settings

router = APIRouter(prefix="/resume", tags=["Resume Intelligence Service"])

@router.post("/upload")
def upload_resume(
    file: UploadFile = File(...),
    target_jd: str = Form(""),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not (file.filename.endswith(".pdf") or file.filename.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Invalid file format. Only PDF and DOCX files are allowed.")

    upload_dir = os.path.join(settings.UPLOAD_DIRECTORY, "resumes")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_location = os.path.join(upload_dir, f"user_{current_user.id}_{file.filename}")
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return ResumeService.process_and_analyze_resume(
        db=db,
        user_id=current_user.id,
        file_path=file_location,
        original_filename=file.filename,
        target_jd=target_jd
    )

@router.post("/analyze")
def analyze_resume_text(
    resume_text: str = Form(...),
    target_jd: str = Form(""),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    doc_eval = DocumentClassifier.classify_document(resume_text)
    if not doc_eval["is_valid_resume"]:
        return {
            "status": "rejected",
            "doc_type": doc_eval["doc_type"],
            "confidence_score": doc_eval["confidence_score"],
            "message": doc_eval["message"],
            "red_flags": doc_eval["red_flags"]
        }

    parsed = StructuredResumeParser.parse_resume(resume_text)
    if target_jd and len(target_jd.strip()) > 20:
        res = MatcherEngine.evaluate_mode_b_job_match(parsed, resume_text, target_jd)
    else:
        res = MatcherEngine.evaluate_mode_a_health_check(parsed, resume_text)

    return {
        "status": "success",
        "doc_type": doc_eval["doc_type"],
        "confidence_score": doc_eval["confidence_score"],
        "parsed_resume": parsed,
        "analysis_result": res
    }

@router.post("/job-match")
def job_match_analysis(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    resume_text = payload.get("resume_text", "")
    target_jd = payload.get("job_description", "")
    
    if not resume_text or not target_jd:
        raise HTTPException(status_code=400, detail="Both resume_text and job_description are required for Mode B Job Match analysis.")

    parsed = StructuredResumeParser.parse_resume(resume_text)
    res = MatcherEngine.evaluate_mode_b_job_match(parsed, resume_text, target_jd)
    return {
        "status": "success",
        "analysis_result": res
    }

@router.get("/history")
def get_resume_history(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ResumeService.get_history(db, user_id=current_user.id)

@router.get("/{resume_id}")

@router.get("/{resume_id}/report")
def get_resume_report(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    report = ResumeService.get_resume_by_id(db, user_id=current_user.id, resume_id=resume_id)
    if not report:
        raise HTTPException(status_code=404, detail="Resume record not found.")
    return report

@router.delete("/{resume_id}")
def delete_resume_version(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    success = ResumeService.delete_resume(db, user_id=current_user.id, resume_id=resume_id)
    if not success:
        raise HTTPException(status_code=404, detail="Resume record not found.")
    return {"status": "success", "message": f"Resume version {resume_id} deleted successfully."}
