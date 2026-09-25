import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.resume_service.detector.resume_detector import ResumeDetector

def test_resume_detection_layer():
    # 1. Valid Resume Text
    valid_resume = """
    Alex Mercer
    Email: alex.mercer@gmail.com | Phone: +1-555-019-2834 | LinkedIn: linkedin.com/in/alexmercer
    OBJECTIVE
    Ambitious Software Engineer seeking SDE role.
    EDUCATION
    B.Tech in Computer Science, GPA: 3.8/4.0
    TECHNICAL SKILLS
    Languages: Python, Java, C++, SQL, JavaScript, HTML, CSS
    Frameworks: FastAPI, React, Docker, Git
    EXPERIENCE
    Software Engineering Intern - TechCorp
    - Developed REST APIs using FastAPI and Python, improving response latency by 35%.
    - Built responsive frontend components in React and TypeScript.
    PROJECTS
    Placement Operating System
    - Architected microservices with MySQL database and ChromaDB vector store.
    """

    res_valid = ResumeDetector.detect_resume(valid_resume)
    assert res_valid["is_resume"] == True
    assert res_valid["confidence_score"] >= 80.0
    print(f"[+] Valid Resume Detection Passed: Score = {res_valid['confidence_score']}/100 ({res_valid['classification']})")

    # 2. Non-Resume Text (College Practical / Lab Report)
    college_practical = """
    DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
    PRACTICAL NO 4: IMPLEMENTATION OF BINARY SEARCH TREE
    Lab Report Submitted By: Student ID 2024001
    Submitted To: Prof. H. Sharma
    Abstract:
    In this experiment, we analyze binary search tree insertion and deletion algorithms.
    Chapter 1: Experimental Setup
    Equipment: Linux Terminal, GCC Compiler, CodeBlocks IDE.
    References:
    1. Introduction to Algorithms - Cormen et al.
    """

    res_invalid = ResumeDetector.detect_resume(college_practical)
    assert res_invalid["is_resume"] == False
    assert res_invalid["confidence_score"] < 50.0
    print(f"[+] Non-Resume Rejection Passed: Score = {res_invalid['confidence_score']}/100 ({res_invalid['classification']})")
    print(f"    Rejection Reason: {res_invalid['reason']}")

    print("\n=======================================================")
    print(" RESUME VALIDATION & CONFIDENCE PIPELINE VERIFIED CLEAN")
    print("=======================================================")

if __name__ == "__main__":
    test_resume_detection_layer()
