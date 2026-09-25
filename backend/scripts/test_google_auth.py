import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal, engine, Base
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.api.v1.auth import decode_token_sub
from app.core.security import create_access_token

def test_google_auth_implementation():
    print("=======================================================")
    print(" PLACEX GOOGLE OAUTH AUTHENTICATION INTEGRATION SUITE ")
    print("=======================================================\n")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Cleanup previous test users
        for email in ["google.new@placex.ai", "google.existing@placex.ai"]:
            u = UserRepository.get_by_email(db, email)
            if u:
                db.delete(u)
                db.commit()

        # 1. TEST 1: New Google User Creation & Clean Profile
        google_info_new = {
            "sub": "google_uid_99991111",
            "email": "google.new@placex.ai",
            "name": "Sarah Connor",
            "picture": "https://lh3.googleusercontent.com/a/test_new_pic"
        }
        user_new = UserRepository.get_or_create_google_user(db, google_info_new)
        assert user_new.id is not None
        assert user_new.email == "google.new@placex.ai"
        assert user_new.google_id == "google_uid_99991111"
        assert user_new.auth_provider == "google"
        
        prof_new = UserRepository.get_profile(db, user_new.id)
        assert prof_new.target_company is None
        assert prof_new.target_role is None
        print(f"[+] TEST 1 PASSED: New Google User '{user_new.full_name}' created with clean profile & no demo stats.")

        # 2. TEST 2: Existing Email Account Linking (No Duplicate Accounts)
        # First register email user
        email_user = UserRepository.create_user(db, UserCreate(
            email="google.existing@placex.ai",
            password="SecurePassword123!",
            full_name="Alex Existing",
            role="student"
        ))
        initial_id = email_user.id

        # Now authenticate with Google using same email
        google_info_exist = {
            "sub": "google_uid_88882222",
            "email": "google.existing@placex.ai",
            "name": "Alex Existing Google",
            "picture": "https://lh3.googleusercontent.com/a/test_exist_pic"
        }
        linked_user = UserRepository.get_or_create_google_user(db, google_info_exist)
        assert linked_user.id == initial_id
        assert linked_user.google_id == "google_uid_88882222"
        print(f"[+] TEST 2 PASSED: Safely linked Google identity to existing account (User ID: {linked_user.id}) without duplicates.")

        # 3. TEST 3: JWT Token Generation & Session Compatibility
        jwt_token = create_access_token(subject=user_new.id)
        decoded_sub = decode_token_sub(jwt_token)
        assert int(decoded_sub) == user_new.id
        print(f"[+] TEST 3 PASSED: Issued valid PlaceX JWT token for Google user ID {user_new.id}.")

        # 4. TEST 4: Profile & Memory Data Isolation
        mem_new = UserRepository.get_profile(db, user_new.id)
        mem_exist = UserRepository.get_profile(db, linked_user.id)
        assert mem_new.user_id != mem_exist.user_id
        print(f"[+] TEST 4 PASSED: User data isolation verified between User {user_new.id} and User {linked_user.id}.")

    finally:
        db.close()

    print("\n=======================================================")
    print(" ALL GOOGLE OAUTH ACCEPTANCE TESTS PASSED 100% CLEAN ")
    print("=======================================================")

if __name__ == "__main__":
    test_google_auth_implementation()
