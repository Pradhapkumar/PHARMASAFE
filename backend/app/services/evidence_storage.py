"""
Evidence Storage Abstraction — Phase 11: Advanced Evidence + Analytics.

Provides storage operations with mandatory SHA-256 integrity fingerprinting.
Supports local filesystem storage with an interface designed for future S3/MinIO
object storage backends without code breakage.

Important:
  Finalized compliance evidence (linked to verified destruction certificates,
  Dead Batch Registry, or closed investigations) is protected against deletion.
"""
import os
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException, status
from backend.app.core.config import settings


class EvidenceStorage:
    """
    Storage manager for evidentiary artifacts (photos, certificates, manifests,
    scale receipts, and marketplace screenshots).
    """

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = os.path.abspath(base_dir or settings.EVIDENCE_DIR)
        os.makedirs(self.base_dir, exist_ok=True)

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        """
        Computes canonical SHA-256 integrity fingerprint for a byte stream.
        This provides tamper-evidence verifying the stored file has not changed.
        """
        hasher = hashlib.sha256()
        hasher.update(content)
        return hasher.hexdigest()

    def save(
        self,
        file_bytes: bytes,
        filename: str,
        subfolder: Optional[str] = None
    ) -> Tuple[str, str, int]:
        """
        Persists evidence bytes to storage.
        Returns: (storage_reference, sha256_checksum, file_size_bytes)
        """
        target_dir = os.path.join(self.base_dir, subfolder) if subfolder else self.base_dir
        os.makedirs(target_dir, exist_ok=True)

        # Sanitize filename
        clean_name = os.path.basename(filename).replace(" ", "_")
        timestamp_prefix = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        final_filename = f"{timestamp_prefix}_{clean_name}"
        full_path = os.path.join(target_dir, final_filename)

        with open(full_path, "wb") as f:
            f.write(file_bytes)

        checksum = self.compute_sha256(file_bytes)
        file_size = len(file_bytes)

        # Build relative storage reference (e.g. "evidence/subfolder/file.jpg")
        rel_path = os.path.relpath(full_path, start=os.path.dirname(self.base_dir)).replace("\\", "/")
        storage_ref = f"/storage/{rel_path}"

        return storage_ref, checksum, file_size

    def retrieve(self, storage_reference: str) -> bytes:
        """
        Reads evidence bytes from storage reference.
        """
        # Strip "/storage/" prefix if present
        rel_path = storage_reference.replace("/storage/", "").replace("/", os.sep)
        full_path = os.path.join(os.path.dirname(self.base_dir), rel_path)

        if not os.path.exists(full_path):
            # Fallback to direct check inside base_dir
            alt_path = os.path.join(self.base_dir, os.path.basename(storage_reference))
            if os.path.exists(alt_path):
                full_path = alt_path
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Evidence file not found at reference: {storage_reference}"
                )

        with open(full_path, "rb") as f:
            return f.read()

    def delete_if_allowed(self, storage_reference: str, is_finalized: bool) -> bool:
        """
        Deletes evidence only if NOT finalized. Finalized compliance evidence is protected.
        """
        if is_finalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Finalized compliance evidence is permanently sealed and cannot be deleted."
            )

        try:
            rel_path = storage_reference.replace("/storage/", "").replace("/", os.sep)
            full_path = os.path.join(os.path.dirname(self.base_dir), rel_path)
            if os.path.exists(full_path):
                os.remove(full_path)
                return True
            return False
        except Exception as e:
            return False

    def get_metadata(self, storage_reference: str) -> Dict[str, Any]:
        """
        Inspects stored file and re-computes checksum to verify integrity.
        """
        try:
            content = self.retrieve(storage_reference)
            current_checksum = self.compute_sha256(content)
            return {
                "storage_reference": storage_reference,
                "current_checksum": current_checksum,
                "size_bytes": len(content),
                "is_accessible": True,
            }
        except Exception:
            return {
                "storage_reference": storage_reference,
                "current_checksum": None,
                "size_bytes": 0,
                "is_accessible": False,
            }


evidence_storage = EvidenceStorage()
