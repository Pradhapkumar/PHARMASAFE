"""Thin repository layer for Batch DB queries."""
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.batch import Batch, BatchStatusEnum


def get_batch_by_id(db: Session, batch_id: str) -> Optional[Batch]:
    return db.query(Batch).filter(Batch.id == batch_id).first()


def get_batch_by_number(db: Session, batch_number: str) -> Optional[Batch]:
    return db.query(Batch).filter(Batch.batch_number == batch_number).first()


def get_batch_by_id_or_number(db: Session, identifier: str) -> Optional[Batch]:
    return db.query(Batch).filter(
        (Batch.id == identifier) | (Batch.batch_number == identifier)
    ).first()


def list_batches(
    db: Session,
    status: Optional[BatchStatusEnum] = None,
    medicine_id: Optional[str] = None,
    manufacturer_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Batch]:
    query = db.query(Batch)
    if status:
        query = query.filter(Batch.status == status)
    if medicine_id:
        query = query.filter(Batch.medicine_id == medicine_id)
    if manufacturer_id:
        query = query.filter(Batch.manufacturer_id == manufacturer_id)
    return query.offset(offset).limit(limit).all()
