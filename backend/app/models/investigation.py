"""
Investigation Models — Phase 11: Advanced Evidence + Analytics.

Manages compliance and forensic investigation workspaces for suspicious lots,
discrepancies, recall breaches, re-entry attempts, and counterfeit alerts.
"""
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum, Float, JSON
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class CasePriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class CaseStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class InvestigationCase(Base):
    """
    Forensic case file combining custody, inventory, returns, disposal,
    destruction certificates, online listings, and AI risk signals into
    a cohesive 360-degree investigation workspace.
    """
    __tablename__ = "investigation_cases"

    id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), unique=True, index=True, nullable=False)  # e.g., "INV-2026-B1001"

    title = Column(String(255), nullable=False)
    priority = Column(Enum(CasePriorityEnum), default=CasePriorityEnum.MEDIUM, nullable=False, index=True)
    status = Column(Enum(CaseStatusEnum), default=CaseStatusEnum.OPEN, nullable=False, index=True)

    # Entity Association
    entity_type = Column(String(64), nullable=False, index=True)  # "BATCH", "SELLER", "RETURN", "LISTING", "CERTIFICATE"
    entity_id = Column(String(64), nullable=False, index=True)
    batch_id = Column(String(64), ForeignKey("batches.id"), nullable=True, index=True)

    # Actor Ownership
    assigned_to_user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    assigned_to_name = Column(String(255), nullable=True)
    created_by_user_id = Column(String(64), ForeignKey("users.id"), nullable=True)

    # Investigation Narrative
    summary = Column(Text, nullable=False)
    findings = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # AI Risk Context Snapshot
    risk_level = Column(String(32), default="MEDIUM", nullable=False)
    risk_score = Column(Float, default=0.5, nullable=False)
    risk_factors = Column(JSON, nullable=True)

    # Lifecycle Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    batch = relationship("Batch", foreign_keys=[batch_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id])
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    notes = relationship("InvestigationNote", back_populates="case", cascade="all, delete-orphan", order_by="InvestigationNote.created_at.desc()")
    evidence_links = relationship("InvestigationEvidenceLink", back_populates="case", cascade="all, delete-orphan", order_by="InvestigationEvidenceLink.linked_at.desc()")


class InvestigationNote(Base):
    """
    Append-only investigator notes. Once written, historical notes
    cannot be silently altered or removed.
    """
    __tablename__ = "investigation_notes"

    id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("investigation_cases.id"), nullable=False, index=True)

    author_id = Column(String(64), ForeignKey("users.id"), nullable=True)
    author_name = Column(String(255), nullable=False)
    author_role = Column(String(64), nullable=False)

    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)

    case = relationship("InvestigationCase", back_populates="notes")
    author = relationship("User", foreign_keys=[author_id])


class InvestigationEvidenceLink(Base):
    """
    Relational junction mapping evidence artifacts into specific investigation dossiers.
    """
    __tablename__ = "investigation_evidence_links"

    id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("investigation_cases.id"), nullable=False, index=True)
    evidence_id = Column(String(64), ForeignKey("evidence_records.id"), nullable=False, index=True)

    linked_by_id = Column(String(64), ForeignKey("users.id"), nullable=True)
    relevance_notes = Column(String(512), nullable=True)
    linked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)

    case = relationship("InvestigationCase", back_populates="evidence_links")
    evidence = relationship("Evidence")
    linked_by = relationship("User", foreign_keys=[linked_by_id])
