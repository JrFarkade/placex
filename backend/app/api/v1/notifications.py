"""
PlaceX Notification API Endpoints.
Provides student-specific notification retrieval, mark-as-read, and module routing.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.v1.auth import get_current_user
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieves all notifications for the authenticated student with unread counts.
    """
    return NotificationService.get_notifications(db, current_user.id)


@router.patch("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Marks a single notification as read.
    """
    success = NotificationService.mark_read(db, current_user.id, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success", "notification_id": notification_id, "read": True}


@router.post("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Marks all notifications for the authenticated student as read.
    """
    count = NotificationService.mark_all_read(db, current_user.id)
    return {"status": "success", "marked_read_count": count}
