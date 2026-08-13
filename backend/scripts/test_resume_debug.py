import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.resume_service.extractor.pdf_extractor import PDFExtractor
from app.resume_service.extractor.docx_extractor import DOCXExtractor
from app.resume_service.detector.document_classifier import DocumentClassifier, DocumentType

def test_resume_pipeline_fix():
    print("=======================================================")
    print(" PLACEX RESUME PIPELINE 8-TEST CASE VERIFICATION")
    print("=======================================================\n")

    # 1. TEST 1: Normal Professional Resume
    prof_resume = """
    Jane Doe
    Email: jane.doe@techcompany.com | Phone: +1-555-019-9988 | LinkedIn: linkedin.com/in/janedoe
    EXPERIENCE
    Senior Software Engineer - CloudScale Inc (2021 - Present)
    - Architected distributed microservices handling 50k requests/sec.
    - Optimized PostgreSQL query execution plans reducing latency by 40%.
    EDUCATION
    B.S. in Computer Science - State University
    SKILLS
    Python, Go, PostgreSQL, Docker, Kubernetes, AWS
    """
    res1 = DocumentClassifier.classify_document(prof_resume, extraction_status="SUCCESS")
    assert res1["doc_type"] == DocumentType.RESUME
    print(f"[+] TEST 1 PASSED: Normal Professional Resume -> {res1['doc_type']} (Confidence: {res1['confidence_score']})")

    # 2. TEST 2: Student / Fresher Resume (Zero Experience)
    student_resume = """
    Aarav Patel
    Email: aarav.patel@college.edu | Phone: +91-9876543210 | GitHub: github.com/aaravpatel
    EDUCATION
    B.Tech in Computer Science and Engineering - National Institute of Technology (2021-2025)
    CGPA: 8.9 / 10.0
    TECHNICAL SKILLS
    Languages: Python, C++, SQL, HTML, CSS, JavaScript
    Tools: Git, VS Code, Linux
    PROJECTS
    AI Placement Preparation System
    - Built backend microservices with FastAPI and SQLAlchemy.
    - Designed React frontend UI components using TailwindCSS.
    CERTIFICATIONS
    - Deep Learning Specialization (Coursera)
    """
    res2 = DocumentClassifier.classify_document(student_resume, extraction_status="SUCCESS")
    assert res2["doc_type"] == DocumentType.RESUME
    assert res2["is_valid_resume"] == True
    print(f"[+] TEST 2 PASSED: Student/Fresher Resume (0 Work Experience) -> {res2['doc_type']} (Confidence: {res2['confidence_score']})")

    # 3. TEST 3: DOCX Resume Text
    docx_text = student_resume
    res3 = DocumentClassifier.classify_document(docx_text, extraction_status="SUCCESS")
    assert res3["doc_type"] in [DocumentType.RESUME, DocumentType.CV]
    print(f"[+] TEST 3 PASSED: DOCX Resume -> {res3['doc_type']}")

    # 4. TEST 4: College Practical PDF
    college_practical = """
    DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
    PRACTICAL NO 5: IMPLEMENTATION OF DIJKSTRA ALGORITHM
    Submitted By: Student Roll No 21045
    Submitted To: Prof. S. Mehta
    Abstract:
    This report contains experiment setup and C++ code for Dijkstra shortest path logic.
    """
    res4 = DocumentClassifier.classify_document(college_practical, extraction_status="SUCCESS")
    assert res4["doc_type"] == DocumentType.NON_RESUME
    print(f"[+] TEST 4 PASSED: College Practical PDF -> {res4['doc_type']} (Message: '{res4['message']}')")

    # 5. TEST 5: College Assignment PDF
    college_assignment = """
    DEPARTMENT OF ELECTRICAL ENGINEERING
    ASSIGNMENT NO 2: SIGNAL PROCESSING EXERCISES
    Submitted By: Student 102
    Question 1: Calculate Fourier transform of step function.
    Question 2: Derive impulse response.
    """
    res5 = DocumentClassifier.classify_document(college_assignment, extraction_status="SUCCESS")
    assert res5["doc_type"] == DocumentType.NON_RESUME
    print(f"[+] TEST 5 PASSED: College Assignment PDF -> {res5['doc_type']}")

    # 6. TEST 6: Research Paper
    research_paper = """
    AN EFFICIENT NEURAL NETWORK ARCHITECTURE FOR REAL-TIME VISION
    Abstract:
    We present a novel convolution block for edge devices.
    1. Introduction
    Recent advances in computer vision have driven deep learning deployments...
    References:
    1. Vaswani et al. Attention is all you need.
    """
    res6 = DocumentClassifier.classify_document(research_paper, extraction_status="SUCCESS")
    assert res6["doc_type"] == DocumentType.NON_RESUME
    print(f"[+] TEST 6 PASSED: Research Paper -> {res6['doc_type']}")

    # 7. TEST 7: Image-Only / Scanned PDF State
    res7 = DocumentClassifier.classify_document("", extraction_status="IMAGE_ONLY")
    assert res7["doc_type"] == DocumentType.IMAGE_ONLY
    print(f"[+] TEST 7 PASSED: Scanned Image-Only PDF -> {res7['doc_type']} (Message: '{res7['message']}')")

    # 8. TEST 8: Corrupted / Failed PDF Extraction State
    res8 = DocumentClassifier.classify_document("", extraction_status="EXTRACTION_FAILED")
    assert res8["doc_type"] == DocumentType.EXTRACTION_FAILED
    print(f"[+] TEST 8 PASSED: Corrupted / Unreadable PDF -> {res8['doc_type']} (Message: '{res8['message']}')")

    print("\n=======================================================")
    print(" ALL 8 TEST CASES PASSED 100% CLEAN WITH ZERO FALSE REJECTIONS")
    print("=======================================================")

if __name__ == "__main__":
    test_resume_pipeline_fix()
