from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from backend.app.db.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    action = Column(String(128), nullable=False, index=True)  # e.g., "BATCH_CREATED", "STATUS_CHANGED", "CUSTODY_ACCEPTED", "DESTRUCTION_CERTIFIED", "REENTRY_ALERT"
    entity_type = Column(String(64), nullable=False, index=True) # "BATCH", "RETURN", "DESTRUCTION", "USER"
    entity_id = Column(String(64), nullable=False, index=True)
    
    actor_user_id = Column(String(64), ForeignKey("users.id"), nullable=True)
    actor_role = Column(String(64), nullable=True)
    actor_ip = Column(String(64), nullable=True)
    
    details = Column(Text, nullable=True)
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
