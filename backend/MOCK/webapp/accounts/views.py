"""
PlaceX Accounts Views — Authentication & Profile Management
"""

from django.conf import settings
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import PlaceXUser


def login_view(request):
    """Render custom login view with GitHub and LinkedIn OAuth sign-in cards and local credentials fallback."""
    if request.user.is_authenticated:
        return redirect("dashboard:index")

    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            messages.success(request, f"Welcome back, {user.first_name or user.username}!")
            next_url = request.GET.get("next") or request.POST.get("next") or "dashboard:index"
            return redirect(next_url)
        else:
            messages.error(request, "Invalid username or password.")

    return render(request, "accounts/login.html", {"show_dev_setup_note": settings.DEBUG})


@login_required
def profile_view(request):
    """Render candidate profile and OAuth connection status."""
    if request.method == "POST":
        user = request.user
        user.target_role = request.POST.get("target_role", user.target_role)
        user.target_level = request.POST.get("target_level", user.target_level)
        user.tech_stack = request.POST.get("tech_stack", user.tech_stack)
        user.bio = request.POST.get("bio", user.bio)
        user.save()
        messages.success(request, "Profile updated successfully.")
        return redirect("accounts:profile")

    return render(request, "accounts/profile.html", {"user": request.user})


def logout_view(request):
    """Log out current user and redirect to login."""
    logout(request)
    messages.info(request, "You have been logged out.")
    return redirect("accounts:login")
