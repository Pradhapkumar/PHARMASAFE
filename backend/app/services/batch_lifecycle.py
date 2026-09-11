"""
Batch Lifecycle Service — validates and executes status transitions.
Enforces the closed-loop state machine defined in Phase 1.
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from backend.app.models.batch import Batch, BatchStatusEnum
from backend.app.models.audit import AuditLog
import uuid

# Valid forward transitions in the batch lifecycle
VALID_TRANSITIONS: dict[BatchStatusEnum, set[BatchStatusEnum]] = {
    BatchStatusEnum.MANUFACTURED: {
        BatchStatusEnum.IN_DISTRIBUTION,
        BatchStatusEnum.RECALLED,
    },
    BatchStatusEnum.IN_DISTRIBUTION: {
        BatchStatusEnum.AT_PHARMACY,
        BatchStatusEnum.RECALLED,
        BatchStatusEnum.RETURN_INITIATED,
    },
    BatchStatusEnum.AT_PHARMACY: {
        BatchStatusEnum.DISPENSED,
        BatchStatusEnum.EXPIRED,
        BatchStatusEnum.RECALLED,
        BatchStatusEnum.RETURN_INITIATED,
        BatchStatusEnum.FLAGGED_SUSPICIOUS,
    },
    BatchStatusEnum.DISPENSED: {
        BatchStatusEnum.RECALLED,
        BatchStatusEnum.RETURN_INITIATED,
    },
    BatchStatusEnum.EXPIRED: {
        BatchStatusEnum.RETURN_INITIATED,
        BatchStatusEnum.RECALLED,
    },
    BatchStatusEnum.RECALLED: {
        BatchStatusEnum.RETURN_INITIATED,
    },
    BatchStatusEnum.FLAGGED_SUSPICIOUS: {
        BatchStatusEnum.RETURN_INITIATED,
        BatchStatusEnum.RECALLED,
    },
    BatchStatusEnum.RETURN_INITIATED: {
        BatchStatusEnum.RETURN_IN_TRANSIT,
        BatchStatusEnum.RETURN_INITIATED,  # idempotent
    },
    BatchStatusEnum.RETURN_IN_TRANSIT: {
        BatchStatusEnum.RECEIVED_AT_DISPOSAL,
    },
    BatchStatusEnum.RECEIVED_AT_DISPOSAL: {
        BatchStatusEnum.DEAD_BATCH,
    },
    # DEAD_BATCH is a terminal state — no further transitions allowed
    BatchStatusEnum.DEAD_BATCH: set(),
}


class BatchLifecycleError(Exception):
    """Raised when a status transition is invalid."""
    pass


def is_transition_valid(current: BatchStatusEnum, target: BatchStatusEnum) -> bool:
    """Return True if transitioning from current → target is permitted."""
    return target in VALID_TRANSITIONS.get(current, set())


def transition_batch_status(
    db: Session,
    batch: Batch,
    new_status: BatchStatusEnum,
    actor_user_id: Optional[str] = None,
    actor_role: Optional[str] = None,
    notes: Optional[str] = None,
) -> Batch:
    """
    Validate and execute a batch status transition.
    Creates an AuditLog entry for every transition.
    Raises BatchLifecycleError if the transition is not permitted.
    """
    if batch.status == new_status:
        return batch  # Already in target state — idempotent

    if not is_transition_valid(batch.status, new_status):
        raise BatchLifecycleError(
            f"Invalid status transition: {batch.status.value} → {new_status.value} "
            f"for batch {batch.batch_number}. "
            f"Allowed transitions from {batch.status.value}: "
            f"{[s.value for s in VALID_TRANSITIONS.get(batch.status, set())]}"
        )

    previous_status = batch.status
    batch.status = new_status
    batch.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="BATCH_STATUS_TRANSITION",
        entity_type="BATCH",
        entity_id=batch.id,
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        details=(
            f"Batch {batch.batch_number} transitioned: "
            f"{previous_status.value} → {new_status.value}. "
            f"{notes or ''}"
        ).strip(),
        previous_state={"status": previous_status.value},
        new_state={"status": new_status.value},
    )
    db.add(audit)
    return batch
