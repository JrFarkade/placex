import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("placex.pdf_extractor")

class PDFExtractor:
    """
    Production-Grade Multi-Engine PDF Text Extractor for PlaceX.
    Uses PyMuPDF (fitz), pdfplumber, and pypdf with explicit Scanned/Image-Only & Extraction-Failed state detection.
    """

    @classmethod
    def extract_text_and_info(cls, file_path: str) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            logger.error(f"PDF file not found at {file_path}")
            return {
                "text": "",
                "status": "EXTRACTION_FAILED",
                "page_count": 0,
                "character_count": 0,
                "engine": "none",
                "error": f"File not found at {file_path}"
            }

        extracted_text = ""
        page_count = 0
        has_images = False
        engine_used = "none"
        error_msg = None

        # Engine 1: PyMuPDF (fitz)
        try:
            import fitz
            doc = fitz.open(file_path)
            page_count = len(doc)
            fitz_text = ""
            for page in doc:
                text = page.get_text()
                if text and text.strip():
                    fitz_text += text.strip() + "\n\n"
                if page.get_images():
                    has_images = True
            
            if fitz_text.strip():
                extracted_text = fitz_text.strip()
                engine_used = "PyMuPDF (fitz)"
        except Exception as e:
            logger.warning(f"PyMuPDF extraction failed: {e}")
            error_msg = str(e)

        # Engine 2: pdfplumber fallback if PyMuPDF yielded empty text
        if not extracted_text.strip():
            try:
                import pdfplumber
                with pdfplumber.open(file_path) as pdf:
                    page_count = max(page_count, len(pdf.pages))
                    plumber_text = ""
                    for page in pdf.pages:
                        text = page.extract_text()
                        if text and text.strip():
                            plumber_text += text.strip() + "\n\n"
                        if getattr(page, 'images', None):
                            has_images = True
                    
                    if plumber_text.strip():
                        extracted_text = plumber_text.strip()
                        engine_used = "pdfplumber"
            except Exception as e:
                logger.warning(f"pdfplumber extraction failed: {e}")
                if not error_msg: error_msg = str(e)

        # Engine 3: pypdf fallback if still empty
        if not extracted_text.strip():
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                page_count = max(page_count, len(reader.pages))
                pypdf_text = ""
                for page in reader.pages:
                    text = page.extract_text()
                    if text and text.strip():
                        pypdf_text += text.strip() + "\n\n"
                
                if pypdf_text.strip():
                    extracted_text = pypdf_text.strip()
                    engine_used = "pypdf"
            except Exception as e:
                logger.warning(f"pypdf extraction failed: {e}")
                if not error_msg: error_msg = str(e)

        char_count = len(extracted_text.strip())

        # Determine Processing State
        if char_count > 0:
            status = "SUCCESS"
        elif page_count > 0 and (has_images or char_count == 0):
            # Scanned / Image-Only PDF Detection
            status = "IMAGE_ONLY"
        else:
            status = "EXTRACTION_FAILED"

        # Diagnostic logging for development debugging
        logger.info(f"[PDF Extractor Debug] File: {os.path.basename(file_path)} | Size: {os.path.getsize(file_path)} bytes | Pages: {page_count} | Status: {status} | Chars: {char_count} | Engine: {engine_used}")

        return {
            "text": extracted_text.strip(),
            "status": status,
            "page_count": page_count,
            "character_count": char_count,
            "engine": engine_used,
            "error": error_msg if status == "EXTRACTION_FAILED" else None
        }

    @classmethod
    def extract_text(cls, file_path: str) -> str:
        res = cls.extract_text_and_info(file_path)
        return res["text"]
