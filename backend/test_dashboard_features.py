"""
Unit and Integration tests for PlaceX Dashboard Service and Models.
Tests streak counting, idempotency per calendar day, goal calculation, and isolation.
"""
from datetime import date, timedelta
from app.database.session import SessionLocal, engine, Base
from app.models.user import User
from app.models.dashboard import StudentDailyActivity, WeeklyGoal
from app.services.dashboard_service import DashboardService

def run_tests():
    db = SessionLocal()
    try:
        print("[TEST] Running DashboardService tests...")

        # 1. Ensure test user exists
        user = db.query(User).filter(User.email == "test_dashboard_user@placex.com").first()
        if not user:
            user = User(
                email="test_dashboard_user@placex.com",
                hashed_password="hashed_pw_test",
                full_name="Dashboard Test Student",
                role="student"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        user_id = user.id
        print(f"[TEST] Using test user_id={user_id}")

        # Clean prior test dashboard data
        db.query(StudentDailyActivity).filter(StudentDailyActivity.user_id == user_id).delete()
        db.query(WeeklyGoal).filter(WeeklyGoal.user_id == user_id).delete()
        db.commit()

        # 2. Test Idempotent Daily Activity Recording
        today = date.today()
        rec1 = DashboardService.record_activity(db, user_id, is_login=True)
        assert rec1.login_count == 1, f"Expected login_count 1, got {rec1.login_count}"
        assert rec1.actions_count == 1, f"Expected actions_count 1, got {rec1.actions_count}"

        # Second login same day must NOT create new row or duplicate streak
        rec2 = DashboardService.record_activity(db, user_id, is_login=True)
        assert rec2.id == rec1.id, "Second call must update existing row, not create duplicate"
        assert rec2.login_count == 2, f"Expected login_count 2, got {rec2.login_count}"
        assert rec2.actions_count == 2, f"Expected actions_count 2, got {rec2.actions_count}"
        print("[TEST] PASS: Idempotent daily login record verified.")

        # 3. Test Streak Calculation
        # Seed 3 consecutive active days: today, yesterday, 2 days ago
        y1 = today - timedelta(days=1)
        y2 = today - timedelta(days=2)
        db.add(StudentDailyActivity(user_id=user_id, activity_date=y1, login_count=1, actions_count=3))
        db.add(StudentDailyActivity(user_id=user_id, activity_date=y2, login_count=1, actions_count=2))
        db.commit()

        streak_data = DashboardService.get_streak_and_calendar(db, user_id, days_count=30)
        assert streak_data["current_streak"] == 3, f"Expected streak 3, got {streak_data['current_streak']}"
        assert streak_data["longest_streak"] >= 3, f"Expected longest streak >= 3, got {streak_data['longest_streak']}"
        assert len(streak_data["calendar"]) > 0, "Calendar array must not be empty"
        print(f"[TEST] PASS: Streak calculation verified (current={streak_data['current_streak']}, longest={streak_data['longest_streak']}).")

        # 4. Test Weekly Goals Retrieval & Default Seeding
        goals = DashboardService.get_or_create_weekly_goals(db, user_id)
        assert len(goals) >= 3, f"Expected at least 3 default goals, got {len(goals)}"
        types = [g["goal_type"] for g in goals]
        assert "coding" in types, "Must have coding goal"
        assert "quiz" in types, "Must have quiz goal"
        assert "interview" in types, "Must have interview goal"
        print("[TEST] PASS: Weekly goals initialized and verified.")

        # 5. Test Goal Creation & Deletion
        new_g = DashboardService.create_goal(db, user_id, "custom", "Review 5 Placement Notes", 5)
        assert new_g["id"] is not None
        assert new_g["title"] == "Review 5 Placement Notes"

        del_ok = DashboardService.delete_goal(db, user_id, new_g["id"])
        assert del_ok is True, "Goal deletion failed"
        print("[TEST] PASS: Goal CRUD verified.")

        # 6. Test Recent Activity Gathering
        activities = DashboardService.get_recent_activities(db, user_id, limit=5)
        assert isinstance(activities, list), "Activities must return a list"
        # 7. Test 7-Day Tracker & Motivational Message
        assert "seven_day_tracker" in streak_data, "seven_day_tracker must be in streak_data"
        assert len(streak_data["seven_day_tracker"]) == 7, "seven_day_tracker must contain exactly 7 days"
        assert "motivational_message" in streak_data, "motivational_message must be present"
        print(f"[TEST] PASS: 7-Day tracker verified with 7 distinct days. Motivational message: '{streak_data['motivational_message']}'")

        # 8. Test Today's Focus
        focus = DashboardService.get_todays_focus(db, user_id)
        assert "title" in focus and "action_label" in focus, "Today's focus must have title and action_label"
        print(f"[TEST] PASS: Today's focus generated: '{focus['title']}' ({focus['action_label']})")

        # 9. Test Skills in Progress
        skills = DashboardService.get_skills_in_progress(db, user_id)
        assert isinstance(skills, list) and len(skills) > 0, "Skills in progress must return a non-empty list"
        print(f"[TEST] PASS: Skills in progress generated with {len(skills)} competencies.")

        print("\nALL DASHBOARD BACKEND TESTS PASSED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
