import sys
import os

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal, Base, engine
from app.learning_engine.services.learning_service import LearningService
from app.models.user import User
import app.models.learning # Ensure model registration

def test_roadmap_engine():
    print("=== Testing 288-Week DOCX Roadmap Engine ===")
    Base.metadata.create_all(bind=engine)

    
    # 1. Test Branches & Levels
    info = LearningService.get_branches_and_levels()
    print("Branches:", info["branches"])
    print("Levels:", info["levels"])
    
    assert len(info["branches"]) == 4, f"Expected 4 branches, got {len(info['branches'])}"
    assert len(info["levels"]) == 3, f"Expected 3 levels, got {len(info['levels'])}"

    db = SessionLocal()
    try:
        user = db.query(User).first()
        user_id = user.id if user else 1

        # 2. Test All 12 Combinations (4 branches x 3 levels)
        total_weeks_checked = 0
        for branch in info["branches"]:
            for level in info["levels"]:
                path_data = LearningService.get_docx_roadmap(db=db, user_id=user_id, branch=branch, level=level)
                weeks_count = len(path_data["weeks"])
                total_weeks_checked += weeks_count
                print(f"Verified {branch} -> {level}: {weeks_count} weeks")
                assert weeks_count == 24, f"Expected 24 weeks for {branch} - {level}, got {weeks_count}"

        print(f"\nTotal verified weeks across all 12 combinations: {total_weeks_checked} (Expected 288)")
        assert total_weeks_checked == 288, f"Expected 288 weeks, got {total_weeks_checked}"

        # 3. Test Toggle Week Status
        test_branch = info["branches"][0]
        test_level = info["levels"][0]
        updated = LearningService.update_week_status(db=db, user_id=user_id, branch=test_branch, level=test_level, week_num=1, status="Completed")
        print(f"\nToggle Week 1 status update test: {updated['completed_count']} completed week(s) in {test_branch} ({test_level})")
        assert updated['completed_count'] >= 1, "Expected at least 1 completed week"

        print("\nALL ROADMAP TESTS PASSED 100% SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_roadmap_engine()
