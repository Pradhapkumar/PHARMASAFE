"""
Centralized Evidence Model — Phase 11: Advanced Evidence + Analytics.

Connects operational events, documents, images, certificates, quantities,
custody events, and AI risk signals into an immutable, auditable evidence trail.

Key Rules:
  - SHA-256 checksums are integrity fingerprints ensuring stored files have not changed.
  - Finalized evidence (linked to destruction certificates, Dead Batch Registry, or closed investigations)
    cannot be casually deleted or mutated (read-only protection).
  - Evidence links to operational entities (Batch, Return, Disposal, Certificate, Listing, Investigation).
"""
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class EvidenceTypeEnum(str, enum.Enum):
    PHOTO = "PHOTO"
    DOCUMENT = "DOCUMENT"
    CERTIFICATE = "CERTIFICATE"
    SCAN_RESULT = "SCAN_RESULT"
    OCR_RESULT = "OCR_RESULT"
    WEIGHT_RECORD = "WEIGHT_RECORD"
    PACKAGING_IMAGE = "PACKAGING_IMAGE"
    DISPOSAL_IMAGE = "DISPOSAL_IMAGE"
    RETURN_IMAGE = "RETURN_IMAGE"
    CUSTODY_PROOF = "CUSTODY_PROOF"
    LISTING_SCREENSHOT = "LISTING_SCREENSHOT"
    OTHER = "OTHER"


class EvidenceStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    FLAGGED = "FLAGGED"
    ARCHIVED = "ARCHIVED"
    SEALED = "SEALED"


class OCRStatusEnum(str, enum.Enum):
    NOT_APPLICABLE = "NOT_APPLICABLE"
    PENDING = "PENDING"
    MATCH = "MATCH"
    MISMATCH = "MISMATCH"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    FAILED = "FAILED"
    OCR_UNAVAILABLE = "OCR_UNAVAILABLE"


class ScreeningResultEnum(str, enum.Enum):
    NOT_PERFORMED = "NOT_PERFORMED"
    NO_OBVIOUS_ANOMALY = "NO_OBVIOUS_ANOMALY"
    POSSIBLE_PACKAGING_ANOMALY = "POSSIBLE_PACKAGING_ANOMALY"
    LOW_IMAGE_QUALITY = "LOW_IMAGE_QUALITY"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


class Evidence(Base):
    """
    Centralized, tamper-evident record of an evidentiary artifact
    supporting supply-chain, reverse-logistics, disposal, destruction,
    or digital marketplace investigation decisions.
    """
    __tablename__ = "evidence_records"

    id = Column(String(64), primary_key=True, index=True)
    evidence_id = Column(String(64), unique=True, index=True, nullable=False)  # e.g., "EV-2026-001"

    # Polymorphic / Primary entity association
    entity_type = Column(String(64), nullable=False, index=True)  # "BATCH", "RETURN", "DISPOSAL", "CERTIFICATE", "LISTING", "INVESTIGATION"
    entity_id = Column(String(64), nullable=False, index=True)

    # Explicit entity linkage for fast relational joins
    batch_id = Column(String(64), ForeignKey("batches.id"), nullable=True, index=True)
    return_id = Column(String(64), ForeignKey("return_requests.id"), nullable=True, index=True)
    disposal_id = Column(String(64), ForeignKey("disposal_records.id"), nullable=True, index=True)
    certificate_id = Column(String(64), ForeignKey("destruction_records.id"), nullable=True, index=True)
    listing_id = Column(String(64), ForeignKey("online_medicine_listings.id"), nullable=True, index=True)

    # Classification & File Attributes
    evidence_type = Column(Enum(EvidenceTypeEnum), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(64), nullable=False)  # e.g., "image/jpeg", "application/pdf"
    file_size = Column(Integer, nullable=False)      # bytes
    storage_reference = Column(String(512), nullable=False)  # URI or relative storage path

    # Tamper-Evident Integrity Fingerprint (SHA-256)
    checksum = Column(String(64), nullable=False, index=True)
    checksum_algorithm = Column(String(32), default="SHA-256", nullable=False)

    # Provenance & Ownership
    uploaded_by_id = Column(String(64), ForeignKey("users.id"), nullable=True)
    organization_id = Column(String(64), ForeignKey("organizations.id"), nullable=True, index=True)

    # Context & Immutability
    description = Column(Text, nullable=True)
    status = Column(Enum(EvidenceStatusEnum), default=EvidenceStatusEnum.ACTIVE, nullable=False, index=True)
    is_finalized = Column(Boolean, default=False, nullable=False, index=True)  # Sealed if linked to certified destruction/dead registry

    # Optional OCR metadata
    ocr_status = Column(Enum(OCRStatusEnum), default=OCRStatusEnum.NOT_APPLICABLE, nullable=False)
    ocr_extracted_data = Column(JSON, nullable=True)
    ocr_confidence = Column(Integer, nullable=True)  # 0-100%

    # Optional Vision screening metadata
    screening_result = Column(Enum(ScreeningResultEnum), default=ScreeningResultEnum.NOT_PERFORMED, nullable=False)
    screening_details = Column(JSON, nullable=True)

    # Timestamps
    captured_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)

    # Relational bindings
    batch = relationship("Batch", foreign_keys=[batch_id])
    return_request = relationship("ReturnRequest", foreign_keys=[return_id])
    disposal_record = relationship("DisposalRecord", foreign_keys=[disposal_id])
    destruction_record = relationship("DestructionRecord", foreign_keys=[certificate_id])
    listing = relationship("OnlineMedicineListing", foreign_keys=[listing_id])
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    organization = relationship("Organization", foreign_keys=[organization_id])
