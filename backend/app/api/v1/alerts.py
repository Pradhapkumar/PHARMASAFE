from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from backend.app.core.security import get_current_user_payload
from backend.app.db.session import get_db
from backend.app.models.alert import Alert, AlertSeverity, AlertType

router = APIRouter()


class AlertResponse(BaseModel):
    id: str
    alert_type: str
    severity: str
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: bool
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[AlertResponse])
def list_alerts(
    severity: Optional[AlertSeverity] = None,
    is_read: Optional[bool] = None,
    alert_type: Optional[AlertType] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """List all system alerts. Filterable by severity, read status, and type."""
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity)
    if is_read is not None:
        query = query.filter(Alert.is_read == is_read)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
    return query.order_by(Alert.created_at.desc()).offset(offset).limit(limit).all()


@router.patch("/{alert_id}/read", response_model=AlertResponse)
def mark_alert_read(
    alert_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """Mark an alert as read."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert


@router.patch("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """Mark an alert as resolved."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    alert.is_resolved = True
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/count/unread")
def get_unread_count(
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """Get count of unread alerts."""
    count = db.query(Alert).filter(Alert.is_read == False).count()
    critical = db.query(Alert).filter(
        Alert.is_read == False, Alert.severity == AlertSeverity.CRITICAL
    ).count()
    return {"unread_total": count, "unread_critical": critical}
