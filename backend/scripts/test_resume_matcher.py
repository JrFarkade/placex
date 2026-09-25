import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.resume_service.detector.document_classifier import DocumentClassifier, DocumentType
from app.resume_service.parser.resume_parser import StructuredResumeParser
from app.resume_service.ats.matcher_engine import MatcherEngine

def test_rebuilt_resume_matcher_service():
    print("=======================================================")
    print(" RUNNING PLACEX RESUME MATCHER MASTER TEST SUITE")
    print("=======================================================\n")

    # ----------------------------------------------------
    # TEST 1: Student / Fresher Resume (Zero Work Experience)
    # ----------------------------------------------------
    fresher_resume = """
    Rohan Sharma
    Email: rohan.sharma@gmail.com | Phone: +91-9876543210 | GitHub: github.com/rohansharma
    EDUCATION
    Bachelor of Technology in Computer Science and Engineering
    ABC Institute of Technology, CGPA: 8.5/10.0 (2021 - 2025)
    TECHNICAL SKILLS
    Programming Languages: Python, C++, SQL, JavaScript, HTML, CSS
    Developer Tools: Git, VS Code, Linux
    PERSONAL PROJECTS
    E-Commerce Platform Microservice
    - Developed scalable REST APIs using Python and FastAPI.
    - Implemented database models in MySQL and Redis caching.
    CERTIFICATIONS
    - Data Structures and Algorithms in C++ (NPTEL)
    """

    doc_fresher = DocumentClassifier.classify_document(fresher_resume)
    assert doc_fresher["is_valid_resume"] == True
    assert doc_fresher["doc_type"] in [DocumentType.RESUME, DocumentType.CV]
    print(f"[+] TEST 1 PASSED: Student/Fresher Resume Accepted cleanly!")
    print(f"    Doc Type: {doc_fresher['doc_type']}, Confidence: {doc_fresher['confidence_score']}/100")

    parsed_fresher = StructuredResumeParser.parse_resume(fresher_resume)
    assert len(parsed_fresher["skills"]["Programming Languages"]) > 0

    # ----------------------------------------------------
    # TEST 2: College Practical PDF / Lab Report Rejection
    # ----------------------------------------------------
    college_practical = """
    DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
    PRACTICAL NO 4: BINARY SEARCH TREE IMPLEMENTATION
    Submitted By: Student ID 2021042
    Submitted To: Prof. K. Verma
    Abstract:
    In this experiment, we analyze binary search tree insertion and deletion algorithms.
    Chapter 1: Experimental Setup & Circuit Diagram
    References: Cormen et al.
    """

    doc_practical = DocumentClassifier.classify_document(college_practical)
    assert doc_practical["is_valid_resume"] == False
    assert doc_practical["doc_type"] == DocumentType.NON_RESUME
    print(f"\n[+] TEST 2 PASSED: College Practical PDF Rejected cleanly!")
    print(f"    Rejection Message: '{doc_practical['message']}'")

    # ----------------------------------------------------
    # TEST 3: Invoice / Non-Resume Rejection
    # ----------------------------------------------------
    invoice_doc = """
    TAX INVOICE #INV-9042
    Bill To: AcroCorp Enterprises
    Total Amount Due: $4,500.00
    Receipt No: 40921
    Department of Procurement
    """

    doc_invoice = DocumentClassifier.classify_document(invoice_doc)
    assert doc_invoice["is_valid_resume"] == False
    assert doc_invoice["doc_type"] == DocumentType.NON_RESUME
    print(f"\n[+] TEST 3 PASSED: Invoice Document Rejected cleanly!")

    # ----------------------------------------------------
    # TEST 4: MODE A — Resume Health Check (Resume Only)
    # ----------------------------------------------------
    health_res = MatcherEngine.evaluate_mode_a_health_check(parsed_fresher, fresher_resume)
    assert health_res["resume_quality_score"] > 60.0
    print(f"\n[+] TEST 4 PASSED: Mode A Health Check Score = {health_res['resume_quality_score']}/100")
    print(f"    Section Scores: {health_res['section_scores']}")

    # ----------------------------------------------------
    # TEST 5: MODE B — Job Match Analysis (Resume + JD)
    # ----------------------------------------------------
    target_job_description = """
    We are looking for a Software Development Engineer with strong expertise in Python, SQL, Docker, AWS, and Microservices.
    Candidate must have experience building RESTful web services and working with Git.
    """

    match_res = MatcherEngine.evaluate_mode_b_job_match(parsed_fresher, fresher_resume, target_job_description)
    assert match_res["placex_match_score"] > 0
    assert "Docker" in match_res["missing_skills"] or "Aws" in match_res["missing_skills"]
    print(f"\n[+] TEST 5 PASSED: Mode B PlaceX Match Score = {match_res['placex_match_score']}/100")
    print(f"    Matching Skills: {match_res['matching_skills']}")
    print(f"    Missing Skills from JD: {match_res['missing_skills']}")
    print(f"    Grounded Suggestion: {match_res['suggestions'][0]}")

    print("\n=======================================================")
    print(" ALL RESUME MATCHER REBUILD TEST SCENARIOS PASSED 100%")
    print("=======================================================")

if __name__ == "__main__":
    test_rebuilt_resume_matcher_service()
