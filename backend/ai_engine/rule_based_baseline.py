import math
from datetime import date, datetime
from typing import Dict, Any, List, Optional
from ai_engine.interfaces import IExpiryPredictor, IAnomalyDetector, IReEntryRiskScorer, IListingSurveillanceEngine

class BaselineExpiryPredictor(IExpiryPredictor):
    def predict_degradation_risk(
        self,
        mfg_date: date,
        expiry_date: date,
        current_date: date,
        current_stage: str,
        transit_delay_days: int = 0
    ) -> Dict[str, Any]:
        total_shelf_days = max(1, (expiry_date - mfg_date).days)
        elapsed_days = (current_date - mfg_date).days
        remaining_days = (expiry_date - current_date).days

        if remaining_days <= 0:
            return {
                "expiry_risk_score": 1.0,
                "risk_level": "CRITICAL",
                "days_to_expiry": remaining_days,
                "is_expired": True,
                "explanation": f"Batch has expired by {abs(remaining_days)} days."
            }

        fraction_elapsed = min(1.0, max(0.0, elapsed_days / total_shelf_days))
        
        # Exponential curve as expiry approaches
        risk_score = math.pow(fraction_elapsed, 2.5)

        # Penalty if stuck in early distribution with little time remaining
        if current_stage in ["IN_DISTRIBUTION", "MANUFACTURED"] and remaining_days < 60:
            risk_score = min(1.0, risk_score + 0.35)

        risk_level = "LOW"
        if risk_score > 0.8:
            risk_level = "HIGH"
        elif risk_score > 0.5:
            risk_level = "MEDIUM"

        return {
            "expiry_risk_score": round(risk_score, 3),
            "risk_level": risk_level,
            "days_to_expiry": remaining_days,
            "is_expired": False,
            "explanation": f"{remaining_days} days remaining ({round(fraction_elapsed*100, 1)}% shelf life elapsed)."
        }

class BaselineAnomalyDetector(IAnomalyDetector):
    def detect_custody_anomalies(
        self,
        transfer_history: List[Dict[str, Any]],
        expected_route_kms: float = 100.0
    ) -> List[Dict[str, Any]]:
        anomalies = []
        if not transfer_history:
            return anomalies

        for i, transfer in enumerate(transfer_history):
            # Check quantity discrepancy
            transferred = transfer.get("transferred_quantity", 0)
            verified = transfer.get("verified_quantity")
            if verified is not None and verified < transferred:
                discrepancy = transferred - verified
                anomalies.append({
                    "anomaly_type": "QUANTITY_LEAKAGE",
                    "severity": "HIGH",
                    "description": f"Discrepancy of {discrepancy} units detected during stage: {transfer.get('stage')}.",
                    "raw_evidence": {
                        "transferred": transferred,
                        "verified": verified,
                        "leakage_count": discrepancy
                    }
                })

            # Check rapid jump between distant locations
            if i > 0:
                prev_transfer = transfer_history[i-1]
                lat1, lon1 = prev_transfer.get("latitude"), prev_transfer.get("longitude")
                lat2, lon2 = transfer.get("latitude"), transfer.get("longitude")
                time1 = prev_transfer.get("timestamp")
                time2 = transfer.get("timestamp")

                if lat1 and lon1 and lat2 and lon2 and time1 and time2:
                    # Rough distance check
                    dist_approx = math.sqrt((lat2 - lat1)**2 + (lon2 - lon1)**2) * 111.0 # in km
                    if isinstance(time1, str):
                        t1 = datetime.fromisoformat(time1.replace("Z", "+00:00"))
                    else:
                        t1 = time1
                    if isinstance(time2, str):
                        t2 = datetime.fromisoformat(time2.replace("Z", "+00:00"))
                    else:
                        t2 = time2
                    hours = max(0.1, (t2 - t1).total_seconds() / 3600.0)
                    speed_kmh = dist_approx / hours
                    if speed_kmh > 140.0:  # Improbable ground vehicle speed
                        anomalies.append({
                            "anomaly_type": "SPEED_GEO_JUMP",
                            "severity": "CRITICAL",
                            "description": f"Physically impossible transfer speed detected ({round(speed_kmh, 1)} km/h over {round(dist_approx, 1)} km).",
                            "raw_evidence": {"speed_kmh": speed_kmh, "distance_km": dist_approx, "hours": hours}
                        })

        return anomalies

class BaselineReEntryRiskScorer(IReEntryRiskScorer):
    def evaluate_reentry_risk(
        self,
        batch_status: str,
        is_in_dead_registry: bool,
        scanned_location: Optional[Dict[str, float]] = None,
        discrepancy_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        if is_in_dead_registry:
            return {
                "reentry_risk_score": 1.0,
                "risk_level": "CRITICAL",
                "is_critical_reentry": True,
                "explanation": "CRITICAL: Scanned batch was officially certified as DESTROYED and logged in Dead Batch Registry."
            }

        if batch_status in ["EXPIRED", "RECALLED"]:
            return {
                "reentry_risk_score": 0.85,
                "risk_level": "HIGH",
                "is_critical_reentry": False,
                "explanation": "Batch is expired/recalled but actively scanned at retail/patient touchpoint."
            }

        if batch_status in ["RETURN_INITIATED", "RETURN_IN_TRANSIT", "RECEIVED_AT_DISPOSAL"]:
            return {
                "reentry_risk_score": 0.90,
                "risk_level": "HIGH",
                "is_critical_reentry": False,
                "explanation": "Batch is supposed to be in reverse logistics return custody, yet scanned externally."
            }

        return {
            "reentry_risk_score": 0.05,
            "risk_level": "LOW",
            "is_critical_reentry": False,
            "explanation": "Batch in authorized distribution status with consistent custody trail."
        }

class BaselineListingSurveillanceEngine(IListingSurveillanceEngine):
    def analyze_online_listing(
        self,
        platform_name: str,
        seller_name: str,
        extracted_batch_number: Optional[str],
        listed_price: Optional[float],
        market_average_price: Optional[float],
        is_dead_batch: bool
    ) -> Dict[str, Any]:
        reasons = []
        score = 0.1

        if is_dead_batch:
            return {
                "risk_score": 1.0,
                "risk_level": "CRITICAL",
                "is_dead_batch_match": True,
                "flagged_reasons": "CRITICAL: E-commerce listing features batch number from the Dead Batch Registry."
            }

        # Check deep discount risk
        if listed_price and market_average_price and market_average_price > 0:
            discount = (market_average_price - listed_price) / market_average_price
            if discount > 0.60:
                score += 0.45
                reasons.append(f"Suspiciously steep discount ({round(discount*100)}% below MRP).")
            elif discount > 0.35:
                score += 0.25
                reasons.append(f"Moderate unverified discount ({round(discount*100)}%).")

        # Unverified seller or gray market platform
        if any(unreg in platform_name.lower() for platform_name in [platform_name, seller_name] for unreg in ["telegram", "darknet", "directrx", "unauthorized"]):
            score += 0.40
            reasons.append(f"Listing located on high-risk illicit or peer-to-peer distribution channel ({platform_name}).")

        score = min(1.0, score)
        risk_level = "LOW"
        if score > 0.8:
            risk_level = "HIGH"
        elif score > 0.4:
            risk_level = "MEDIUM"

        return {
            "risk_score": round(score, 2),
            "risk_level": risk_level,
            "is_dead_batch_match": False,
            "flagged_reasons": "; ".join(reasons) if reasons else "No abnormal risk indicators identified."
        }
