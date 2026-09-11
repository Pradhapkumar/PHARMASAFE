"""
DestructionRecord — Phase 8: Final Destruction Certificate Model.

Each record represents one complete, finalized destruction event
that transitions a batch from DISPOSED → DESTROYED with:
  - Canonical SHA-256 certificate hash
  - Multi-party witness attestation
  - Dead Batch Registry inscription
  - Immutable audit trail

Phase 8 owns:
  - DestructionRecord
  - Certificate hash generation + verification
  - Dead Batch Registry inscription
  - Final DESTROYED state
"""
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class CertificateVerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    HASH_MISMATCH = "HASH_MISMATCH"
    QUANTITY_MISMATCH = "QUANTITY_MISMATCH"
    FACILITY_MISMATCH = "FACILITY_MISMATCH"
    FAILED = "FAILED"


class DestructionRecord(Base):
    """
    Immutable destruction certificate record. Once verified, no field except
    verification_status may be modified. Certificate is the authoritative
    source of truth for Phase 8 batch finalization.
    """
    __tablename__ = "destruction_records"

    id = Column(String(64), primary_key=True, index=True)

    # Human-readable certificate ID (e.g. "DC-1001")
    certificate_id = Column(String(64), unique=True, index=True, nullable=True)

    # Core linkage
    batch_id = Column(String(64), ForeignKey("batches.id"), unique=True, nullable=False, index=True)
    disposal_id = Column(String(64), ForeignKey("disposal_records.id"), unique=True, nullable=True, index=True)
    return_id = Column(String(64), ForeignKey("return_requests.id"), unique=True, nullable=True)

    # Organizational actors
    facility_org_id = Column(String(64), ForeignKey("organizations.id"), nullable=False)
    destroyed_by_user_id = Column(String(64), ForeignKey("users.id"), nullable=True)

    # Destruction data
    quantity_destroyed = Column(Integer, nullable=False)
    destruction_method = Column(String(128), nullable=False)  # HIGH_TEMP_INCINERATION_1200C | CHEMICAL_DENATURATION | AUTOCLAVE_SHREDDING

    # Witness attestation
    witness_name = Column(String(255), nullable=False)
    witness_badge_id = Column(String(128), nullable=False)

    # Evidentiary chain
    scale_weight_kg = Column(String(32), nullable=True)
    evidence_reference = Column(String(512), nullable=True)  # replaces evidence_media_url for clarity
    evidence_media_url = Column(String(512), nullable=True)  # kept for backwards compat
    facility_notes = Column(Text, nullable=True)

    # Cryptographic integrity — SHA-256 of canonical destruction data
    certificate_sha256_hash = Column(String(64), unique=True, index=True, nullable=False)
    certificate_url = Column(String(512), nullable=True)

    # Verification lifecycle
    verification_status = Column(
        Enum(CertificateVerificationStatus),
        default=CertificateVerificationStatus.PENDING,
        nullable=False,
        index=True
    )
    verified_at = Column(DateTime, nullable=True)

    # Timestamps
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    batch = relationship("Batch", back_populates="destruction_record")
    return_request = relationship("ReturnRequest", back_populates="destruction_record")
    disposal_record = relationship("DisposalRecord", foreign_keys=[disposal_id], backref="destruction_record")
    facility_org = relationship("Organization", foreign_keys=[facility_org_id])
    destroyed_by_user = relationship("User", foreign_keys=[destroyed_by_user_id])
    dead_batch_entry = relationship("DeadBatch", back_populates="destruction_record", uselist=False)
