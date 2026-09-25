import os
import sys

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal, engine, Base
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.core.config import settings

def seed():
    # Only seed demo data if DEMO_MODE environment variable is explicitly set to true
    demo_mode = os.getenv("DEMO_MODE", "false").lower() == "true"
    if not demo_mode:
        print("[i] DEMO_MODE is false. Skipping automatic demo user seeding.")
        return

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if default demo student exists
        student = UserRepository.get_by_email(db, "student@placex.ai")
        if not student:
            user_in = UserCreate(
                email="student@placex.ai",
                password="student123",
                full_name="Demo Student",
                role="student"
            )
            UserRepository.create_user(db, user_in)
            print("[+] Optional Demo Student Created: student@placex.ai / student123")
        else:
            print("[i] Demo Student already exists.")

        # Check if default demo admin exists
        admin = UserRepository.get_by_email(db, "admin@placex.ai")
        if not admin:
            admin_in = UserCreate(
                email="admin@placex.ai",
                password="admin123",
                full_name="PlaceX Admin",
                role="administrator"
            )
            UserRepository.create_user(db, admin_in)
            print("[+] Optional Demo Admin Created: admin@placex.ai / admin123")
        else:
            print("[i] Demo Admin already exists.")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
