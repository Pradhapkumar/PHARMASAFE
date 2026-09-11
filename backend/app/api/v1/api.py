from fastapi import APIRouter
from backend.app.api.v1 import (
    auth, batches, verification, reverse_logistics, disposal,
    destruction, dead_batches, intelligence, audit,
    organizations, medicines, inventory, sales, alerts, dashboard,
    online_safety, evidence, investigations, analytics, reports
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(medicines.router, prefix="/medicines", tags=["Medicines"])
api_router.include_router(batches.router, prefix="/batches", tags=["Batches & Custody"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(sales.router, prefix="/sales", tags=["Sales"])
api_router.include_router(verification.router, prefix="/verify", tags=["Verification & Scanning"])
api_router.include_router(reverse_logistics.router, prefix="/returns", tags=["Reverse Logistics"])
api_router.include_router(disposal.router, prefix="/disposal", tags=["Operational Disposal"])
api_router.include_router(destruction.router, prefix="/destruction", tags=["Destruction Records"])
api_router.include_router(dead_batches.router, prefix="/dead-batches", tags=["Dead Batch Registry"])
api_router.include_router(online_safety.router, prefix="/online-safety", tags=["Online Medicine Safety"])
api_router.include_router(intelligence.router, prefix="/intelligence", tags=["AI & Risk Intelligence"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["Evidence Intelligence"])
api_router.include_router(investigations.router, prefix="/investigations", tags=["Investigation Cases"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Advanced Analytics"])
api_router.include_router(reports.router, prefix="/reports", tags=["Forensic Reports"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit & Compliance"])


