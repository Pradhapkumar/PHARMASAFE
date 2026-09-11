"""
Alert Service — centralized alert creation for all compliance events.
"""
import uuid
from typing import Optional
from sqlalchemy.orm import Session

from backend.app.models.alert import Alert, AlertSeverity, AlertType


def create_alert(
    db: Session,
    alert_type: AlertType,
    severity: AlertSeverity,
    title: str,
    message: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    auto_flush: bool = True,
) -> Alert:
    """
    Create a compliance alert. Called by business services when anomalies are detected.
    Set auto_flush=False when creating multiple alerts in one transaction.
    """
    alert = Alert(
        id=f"alr_{uuid.uuid4().hex[:12]}",
        alert_type=alert_type,
        severity=severity,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        is_read=False,
        is_resolved=False,
    )
    db.add(alert)
    if auto_flush:
        db.flush()
    return alert
