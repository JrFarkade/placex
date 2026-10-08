from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import PlaceXUser


@admin.register(PlaceXUser)
class PlaceXUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "PlaceX Candidate Profile",
            {
                "fields": (
                    "role",
                    "github_username",
                    "github_profile_url",
                    "linkedin_profile_url",
                    "linkedin_sub",
                    "target_role",
                    "target_level",
                    "tech_stack",
                    "avatar_url",
                    "bio",
                )
            },
        ),
    )
    list_display = ("username", "email", "target_role", "target_level", "role", "is_staff")
    list_filter = ("role", "target_level", "is_staff", "is_active")
    search_fields = ("username", "email", "github_username", "target_role")
