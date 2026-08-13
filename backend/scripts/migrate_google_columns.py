import os
import sys
import sqlite3

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings

def run_migration():
    print("[+] Running PlaceX Database Schema Migration for Google OAuth...")
    
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), db_path.lstrip("./"))
    
    if not os.path.exists(db_path):
        print(f"[*] Database file {db_path} does not exist yet. Will be auto-created by SQLAlchemy.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]

    new_columns = [
        ("google_id", "VARCHAR(255)"),
        ("auth_provider", "VARCHAR(50) DEFAULT 'email'"),
        ("profile_image", "VARCHAR(512)"),
        ("last_login", "DATETIME")
    ]

    for col_name, col_type in new_columns:
        if col_name not in columns:
            print(f"[+] Adding column '{col_name}' to 'users' table...")
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"[-] Column '{col_name}' addition notice: {e}")

    conn.commit()
    conn.close()
    print("[+] Database Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
