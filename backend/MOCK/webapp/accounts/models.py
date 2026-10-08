"""
PlaceX Accounts — Custom User Model & Candidate Profile
Stores candidate profile signals extracted via GitHub & LinkedIn OAuth.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class PlaceXUser(AbstractUser):
    """
    Custom user model for PlaceX candidates and interviewers.
    """
    ROLE_CHOICES = [
        ("candidate", "Candidate"),
        ("interviewer", "Interviewer / Panelist"),
        ("admin", "Administrator"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="candidate")
    github_username = models.CharField(max_length=100, blank=True, null=True, help_text="GitHub handle from OAuth")
    github_profile_url = models.URLField(blank=True, null=True)
    linkedin_profile_url = models.URLField(blank=True, null=True, help_text="LinkedIn profile URL")
    linkedin_sub = models.CharField(max_length=255, blank=True, null=True, help_text="LinkedIn OIDC Subject Identifier")
    target_role = models.CharField(max_length=150, default="Senior Software Engineer")
    target_level = models.CharField(max_length=50, default="L5 / Senior")
    tech_stack = models.CharField(max_length=255, default="Python, Distributed Systems, PostgreSQL, Kafka")
    avatar_url = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    github_repos_flagged = models.PositiveIntegerField(default=0)
    linkedin_completeness_pct = models.PositiveIntegerField(default=0)
    day_streak = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        display_name = self.get_full_name() or self.username
        return f"{display_name} ({self.target_role})"
