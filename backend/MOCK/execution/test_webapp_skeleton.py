"""
PlaceX Webapp Subsystem — Automated Verification Test Suite
Validates the Django project skeleton:
- Settings and database configuration (MySQL / SQLite fallback)
- Custom PlaceXUser model and candidate signals
- Django-Allauth GitHub & LinkedIn OAuth provider configuration
- URL routing and views (login, dashboard, profile, partials)
- HTMX headers and template rendering
"""

import os
import sys
import unittest
from pathlib import Path

# Set up environment and Django paths
workspace_root = Path(__file__).resolve().parent.parent
webapp_path = workspace_root / "webapp"

if str(webapp_path) not in sys.path:
    sys.path.insert(0, str(webapp_path))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "placex_core.settings")

import django
django.setup()

from django.core.management import call_command
from django.conf import settings
from django.test import Client, TestCase
from accounts.models import PlaceXUser
from dashboard.models import CandidateAssignment, InterviewSession
from allauth.socialaccount.models import SocialApp


class TestWebappSkeleton(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = PlaceXUser.objects.create_user(
            username="candidate_jane",
            email="jane@example.com",
            password="testpassword123",
            target_role="Senior Distributed Systems Engineer",
            target_level="L5 / Senior",
            github_username="jane-octocat",
            tech_stack="Python, Kafka, Redis, PostgreSQL",
        )

    def test_01_django_system_check(self):
        """Verify Django system integrity check passes with zero errors."""
        try:
            call_command("check")
        except Exception as e:
            self.fail(f"Django check failed: {e}")

    def test_02_database_configuration(self):
        """Verify database engine configuration."""
        db_conf = settings.DATABASES["default"]
        engine = db_conf["ENGINE"]
        self.assertTrue(
            "mysql" in engine or "sqlite3" in engine,
            f"Expected MySQL or SQLite fallback engine, got {engine}"
        )

    def test_03_custom_user_model(self):
        """Verify PlaceXUser fields and candidate signal persistence."""
        user = PlaceXUser.objects.get(username="candidate_jane")
        self.assertEqual(user.target_role, "Senior Distributed Systems Engineer")
        self.assertEqual(user.target_level, "L5 / Senior")
        self.assertEqual(user.github_username, "jane-octocat")
        self.assertEqual(user.role, "candidate")

    def test_04_allauth_oauth_providers(self):
        """Verify GitHub and LinkedIn OAuth providers are registered in settings."""
        self.assertIn("allauth.socialaccount.providers.github", settings.INSTALLED_APPS)
        self.assertIn("allauth.socialaccount.providers.linkedin_oauth2", settings.INSTALLED_APPS)
        providers = settings.SOCIALACCOUNT_PROVIDERS
        self.assertIn("github", providers)
        self.assertIn("linkedin_oauth2", providers)

    def test_05_login_page_rendering(self):
        """Verify login view renders GitHub and LinkedIn OAuth sign-in options."""
        response = self.client.get("/accounts/login/")
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("PlaceX Candidate Portal", content)
        self.assertIn("Continue with GitHub", content)
        self.assertIn("Continue with LinkedIn", content)
        self.assertIn("directives/webapp/oauth_registration_guide.md", content)

    def test_06_dashboard_authenticated_view(self):
        """Verify authenticated user can view dashboard with assignments and stats."""
        self.client.login(username="candidate_jane", password="testpassword123")
        
        # Create a sample assignment and session
        assignment = CandidateAssignment.objects.create(
            candidate=self.user,
            company_name="Stripe",
            role_title="Senior Software Engineer",
            target_level="L5 / Senior",
            status="pending",
        )
        session = InterviewSession.objects.create(
            candidate=self.user,
            assignment=assignment,
            company_name="Stripe",
            role_title="Senior Software Engineer",
            status="evaluated",
            overall_score=8.5,
            hire_recommendation="Strong Hire",
        )

        response = self.client.get("/dashboard/")
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("Welcome back, candidate_jane", content)
        self.assertIn("Stripe", content)
        self.assertIn("8.5 / 10", content)
        self.assertIn("Strong Hire", content)

    def test_07_htmx_session_partials(self):
        """Verify HTMX partial endpoint returns session rows without full page wrap."""
        self.client.login(username="candidate_jane", password="testpassword123")
        
        session = InterviewSession.objects.create(
            candidate=self.user,
            company_name="Databricks",
            role_title="Staff Systems Engineer",
            status="scheduled",
        )

        response = self.client.get("/dashboard/sessions/partial/", HTTP_HX_REQUEST="true")
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("Databricks", content)
        self.assertIn("Staff Systems Engineer", content)
        self.assertNotIn("<!DOCTYPE html>", content, "Partial should not include base HTML doctype")


if __name__ == "__main__":
    unittest.main(verbosity=2)
