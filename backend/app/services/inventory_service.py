"""
Inventory Service — atomic stock management operations.
Prevents negative stock and ensures transactional safety.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from backend.app.models.inventory import Inventory


class InsufficientStockError(Exception):
    pass


class InventoryNotFoundError(Exception):
    pass


def get_or_create_inventory(db: Session, organization_id: str, batch_id: str) -> Inventory:
    """Return existing inventory record or create a zero-stock one."""
    inv = db.query(Inventory).filter(
        Inventory.organization_id == organization_id,
        Inventory.batch_id == batch_id
    ).first()
    if not inv:
        inv = Inventory(
            id=f"inv_{uuid.uuid4().hex[:12]}",
            organization_id=organization_id,
            batch_id=batch_id,
            quantity_received=0,
            quantity_available=0,
            quantity_quarantined=0,
        )
        db.add(inv)
        db.flush()  # Get DB-generated defaults without committing
    return inv


def receive_inventory(
    db: Session,
    organization_id: str,
    batch_id: str,
    quantity: int,
) -> Inventory:
    """Record receipt of stock at an organization."""
    if quantity <= 0:
        raise ValueError(f"Receive quantity must be positive, got {quantity}")
    inv = get_or_create_inventory(db, organization_id, batch_id)
    inv.quantity_received += quantity
    inv.quantity_available += quantity
    inv.updated_at = datetime.now(timezone.utc)
    db.flush()
    return inv


def deduct_for_sale(
    db: Session,
    organization_id: str,
    batch_id: str,
    quantity: int,
) -> Inventory:
    """Deduct sold quantity from available stock. Raises InsufficientStockError if not enough."""
    if quantity <= 0:
        raise ValueError(f"Sale quantity must be positive, got {quantity}")
    inv = db.query(Inventory).filter(
        Inventory.organization_id == organization_id,
        Inventory.batch_id == batch_id
    ).first()
    if not inv:
        raise InventoryNotFoundError(f"No inventory record for batch {batch_id} at org {organization_id}")
    if inv.quantity_available < quantity:
        raise InsufficientStockError(
            f"Insufficient stock: requested {quantity}, available {inv.quantity_available}"
        )
    inv.quantity_available -= quantity
    inv.updated_at = datetime.now(timezone.utc)
    db.flush()
    return inv


def quarantine_inventory(
    db: Session,
    organization_id: str,
    batch_id: str,
    quantity: int,
) -> Inventory:
    """Move quantity from available to quarantine."""
    if quantity <= 0:
        raise ValueError(f"Quarantine quantity must be positive, got {quantity}")
    inv = db.query(Inventory).filter(
        Inventory.organization_id == organization_id,
        Inventory.batch_id == batch_id
    ).first()
    if not inv:
        raise InventoryNotFoundError(f"No inventory record for batch {batch_id} at org {organization_id}")
    actual = min(quantity, inv.quantity_available)  # Quarantine what's available
    inv.quantity_available -= actual
    inv.quantity_quarantined += actual
    inv.updated_at = datetime.now(timezone.utc)
    db.flush()
    return inv


def transfer_inventory(
    db: Session,
    batch_id: str,
    from_org_id: str,
    to_org_id: str,
    quantity: int,
) -> tuple[Inventory, Inventory]:
    """
    Atomically transfer quantity from one org's inventory to another.
    Returns (source_inventory, dest_inventory).
    """
    if quantity <= 0:
        raise ValueError(f"Transfer quantity must be positive, got {quantity}")

    source = db.query(Inventory).filter(
        Inventory.organization_id == from_org_id,
        Inventory.batch_id == batch_id
    ).first()

    if not source or source.quantity_available < quantity:
        available = source.quantity_available if source else 0
        raise InsufficientStockError(
            f"Insufficient stock at source org {from_org_id}: "
            f"requested {quantity}, available {available}"
        )

    source.quantity_available -= quantity
    source.updated_at = datetime.now(timezone.utc)

    dest = get_or_create_inventory(db, to_org_id, batch_id)
    dest.quantity_received += quantity
    dest.quantity_available += quantity
    dest.updated_at = datetime.now(timezone.utc)

    db.flush()
    return source, dest
