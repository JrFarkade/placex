"""
PlaceX Dashboard — Models for Assignments, Sessions, Evaluation Reports, and Prep Brain Setups.
"""

from django.db import models
from django.conf import settings
import uuid


class CandidateAssignment(models.Model):
    """
    Company interview assignments targeted to candidate profiles.
    """
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("scored", "Scored & Evaluated"),
    ]

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    company_name = models.CharField(max_length=150, default="Stripe")
    company_domain = models.CharField(max_length=150, default="stripe.com")
    company_url = models.URLField(default="https://stripe.com")
    role_title = models.CharField(max_length=150, default="Senior Software Engineer")
    target_level = models.CharField(max_length=50, default="L5 / Senior")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    tech_stack_detected = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company_name} - {self.role_title} ({self.candidate.username})"


class InterviewSession(models.Model):
    """
    Live Brain voice session instance and downstream transcript record.
    """
    STATUS_CHOICES = [
        ("scheduled", "Scheduled"),
        ("active", "Live In Progress"),
        ("completed", "Interview Completed"),
        ("evaluated", "Scored & Evaluated"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    assignment = models.ForeignKey(
        CandidateAssignment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sessions",
    )
    company_name = models.CharField(max_length=150, default="Stripe")
    role_title = models.CharField(max_length=150, default="Senior Software Engineer")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")
    overall_score = models.FloatField(null=True, blank=True)
    hire_recommendation = models.CharField(max_length=50, blank=True, null=True)
    question_bank_payload = models.JSONField(null=True, blank=True)
    transcript_payload = models.JSONField(null=True, blank=True)
    evaluation_report_payload = models.JSONField(null=True, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    round_type = models.CharField(max_length=60, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Session {self.id} - {self.company_name} ({self.status})"


class InterviewSetup(models.Model):
    """
    Candidate intake setup configuration for generating calibrated Question Banks.
    """
    DIFFICULTY_CHOICES = [
        ("Entry-Level", "Entry-Level / Junior"),
        ("Mid-Level", "Mid-Level"),
        ("Senior", "Senior / L5"),
        ("Staff", "Staff / L6"),
        ("Principal", "Principal / Lead"),
    ]

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="interview_setups",
    )
    company = models.CharField(max_length=150)
    role = models.CharField(max_length=150)
    difficulty = models.CharField(max_length=50, choices=DIFFICULTY_CHOICES, default="Senior")
    domain_interests = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.company} - {self.role} ({self.difficulty}) by {self.candidate.username}"


class QuestionBank(models.Model):
    """
    Generated question bank linked to an InterviewSetup instance.
    Stores the structured JSON output from Prep Brain question generation.
    """
    setup = models.OneToOneField(
        InterviewSetup,
        on_delete=models.CASCADE,
        related_name="question_bank",
    )
    questions = models.JSONField(default=dict, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-generated_at"]

    def __str__(self):
        return f"QuestionBank for Setup #{self.setup_id} ({self.setup.company})"
