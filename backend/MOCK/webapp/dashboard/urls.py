from django.urls import path
from . import views

app_name = "dashboard"

urlpatterns = [
    path("", views.index, name="index"),
    path("sessions/partial/", views.session_list_partial, name="session_list_partial"),
    path("sessions/<uuid:session_id>/partial/", views.session_detail_partial, name="session_detail_partial"),
    path("sessions/create/", views.create_session_action, name="create_session"),
    path("setup/new/", views.setup_create, name="setup_create"),
    path("setup/<int:setup_id>/review/", views.setup_review, name="setup_review"),
    path("setup/<int:setup_id>/launch/", views.setup_launch_interview, name="setup_launch"),
]
