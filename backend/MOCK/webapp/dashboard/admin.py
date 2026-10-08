from django.contrib import admin
from .models import CandidateAssignment, InterviewSession


@admin.register(CandidateAssignment)
class CandidateAssignmentAdmin(admin.ModelAdmin):
    list_display = ("company_name", "role_title", "candidate", "status", "created_at")
    list_filter = ("status", "company_name")
    search_fields = ("company_name", "role_title", "candidate__username")


@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "company_name", "role_title", "candidate", "status", "overall_score", "hire_recommendation", "created_at")
    list_filter = ("status", "hire_recommendation", "company_name")
    search_fields = ("id", "company_name", "candidate__username")
