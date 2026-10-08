from app.database.session import SessionLocal
from app.services.quiz_service import fetch_quiz_questions

db = SessionLocal()

domains_to_test = ["ai_ml", "SoftwareEngineering", "Aptitude", "DataScience", "CyberSecurity", "Python"]

print("=== TESTING QUIZ RANDOMIZATION ===")
for domain in domains_to_test:
    print(f"\n--- Testing Domain: {domain} ---")
    attempts = []
    for i in range(3):
        quiz_id, qs = fetch_quiz_questions(db=db, user_id="test_user", domains=[domain], num_questions=5)
        q_ids = [q.id for q in qs]
        attempts.append(q_ids)
        print(f"  Attempt {i+1}: {q_ids}")
        assert len(qs) == 5, f"Expected 5 questions, got {len(qs)}"
        for q in qs:
            assert len(q.options) >= 2, f"Question {q.id} has invalid options!"

    # Verify that not all attempts are identical
    is_all_same = (attempts[0] == attempts[1] == attempts[2])
    print(f"  Randomized across attempts: {not is_all_same}")
    assert not is_all_same, f"Domain {domain} returned identical questions across all 3 attempts!"

print("\nALL QUIZ RANDOMIZATION TESTS PASSED!")
