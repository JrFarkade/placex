"""
PlaceX Webapp — Root URL Configuration
Routes:
- /accounts/ -> OAuth & Local Auth (Allauth + Custom Views)
- /dashboard/ -> Candidate Dashboard & Session Intake
- /admin/ -> Django Admin
- / -> Redirect to /dashboard/ or /accounts/login/
"""

from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("accounts.urls")),
    path("accounts/", include("allauth.urls")),
    path("dashboard/", include("dashboard.urls")),
    path("", RedirectView.as_view(url="/dashboard/", permanent=False), name="root_redirect"),
]
