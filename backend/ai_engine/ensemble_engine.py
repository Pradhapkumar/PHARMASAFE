"""
PharmaSafe Intelligence - Advanced AI Risk & Anomaly Engine (Phase 10)
Multi-model ensemble synthesizing supply chain movements, quantity variances,
aging velocity, marketplace surveillance, and re-entry threat vectors.

CRITICAL INVARIANT:
AI is decision support. AI never overrides deterministic safety rules
(EXPIRED, RECALLED, DESTROYED, DEAD_BATCH remain strictly blocked).
"""
import math
from datetime import date, datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

MODEL_VERSION = "pharma-risk-v2.1-ensemble"


class FeatureExtractor:
    """Extracts structured feature vector from batch, custody, and surveillance telemetry."""

    @staticmethod
    def extract_features(
        batch: Any,
        custody_transfers: List[Any],
        returns: List[Any],
        online_listings: List[Any],
        is_dead_batch: bool,
        current_date: Optional[date] = None,
        reference_location: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        today = current_date or date.today()
        mfg = batch.mfg_date
        exp = batch.expiry_date

        # 1. Expiry & Aging Features
        total_shelf_days = max(1, (exp - mfg).days)
        elapsed_days = (today - mfg).days
        days_to_expiry = (exp - today).days
        fraction_shelf_elapsed = max(0.0, elapsed_days / total_shelf_days)

        # 2. Movement & Transit Features
        hops_count = len(custody_transfers)
        max_speed_kmh = 0.0
        speed_violation = False
        dwell_bottleneck = False

        for i in range(1, hops_count):
            c_prev = custody_transfers[i - 1]
            c_curr = custody_transfers[i]

            lat1 = getattr(c_prev, "latitude", None)
            lon1 = getattr(c_prev, "longitude", None)
            lat2 = getattr(c_curr, "latitude", None)
            lon2 = getattr(c_curr, "longitude", None)
            t1 = getattr(c_prev, "timestamp", None)
            t2 = getattr(c_curr, "timestamp", None)

            if lat1 and lon1 and lat2 and lon2 and t1 and t2:
                # Euclidean approximation for distance (km)
                dist_km = math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2) * 111.0
                if isinstance(t1, str):
                    t1 = datetime.fromisoformat(t1.replace("Z", "+00:00"))
                if isinstance(t2, str):
                    t2 = datetime.fromisoformat(t2.replace("Z", "+00:00"))
                delta_hours = max(0.05, (t2 - t1).total_seconds() / 3600.0)
                speed = dist_km / delta_hours
                if speed > max_speed_kmh:
                    max_speed_kmh = speed
                if speed > 140.0:
                    speed_violation = True

        # Check dwell time in distribution
        if hops_count > 0:
            last_transfer_time = getattr(custody_transfers[-1], "timestamp", None)
            if last_transfer_time:
                if isinstance(last_transfer_time, str):
                    last_transfer_time = datetime.fromisoformat(last_transfer_time.replace("Z", "+00:00"))
                if last_transfer_time.tzinfo is None:
                    last_transfer_time = last_transfer_time.replace(tzinfo=timezone.utc)
                now_utc = datetime.now(timezone.utc)
                dwell_days = (now_utc - last_transfer_time).total_seconds() / 86400.0
                status_val = getattr(batch.status, "value", str(batch.status))
                if status_val in ["IN_DISTRIBUTION", "RETURN_IN_TRANSIT"] and dwell_days > 14:
                    dwell_bottleneck = True

        # 3. Quantity & Reconciliation Features
        initial_qty = getattr(batch, "initial_quantity", 1) or 1
        current_qty = getattr(batch, "current_quantity", 0)
        total_shrinkage = 0
        shrinkage_count = 0

        for c in custody_transfers:
            t_qty = getattr(c, "transferred_quantity", 0) or 0
            v_qty = getattr(c, "verified_quantity", None)
            if v_qty is not None and v_qty < t_qty:
                diff = t_qty - v_qty
                total_shrinkage += diff
                shrinkage_count += 1

        shrinkage_ratio = min(1.0, total_shrinkage / initial_qty)

        # 4. Return Dynamics Features
        has_returns = len(returns) > 0
        total_returned_qty = sum(getattr(r, "quantity", 0) for r in returns)
        return_ratio = min(1.0, total_returned_qty / initial_qty)
        recalled_returns = any(getattr(r, "reason", "") in ["RECALLED", "SUSPECT_COUNTERFEIT"] for r in returns)

        # 5. Online Marketplace Surveillance Features
        listing_count = len(online_listings)
        max_discount = 0.0
        illicit_channel_detected = False

        for lst in online_listings:
            disc = getattr(lst, "discount_percentage", 0.0) or 0.0
            if disc > max_discount:
                max_discount = disc
            plat = (getattr(lst, "platform_name", "") or "").lower()
            seller = (getattr(lst, "seller_name", "") or "").lower()
            if any(term in plat or term in seller for term in ["telegram", "dark", "p2p", "blackmarket", "unverified"]):
                illicit_channel_detected = True

        return {
            "days_to_expiry": days_to_expiry,
            "fraction_shelf_elapsed": fraction_shelf_elapsed,
            "is_expired": days_to_expiry <= 0,
            "max_speed_kmh": round(max_speed_kmh, 1),
            "speed_violation": speed_violation,
            "dwell_bottleneck": dwell_bottleneck,
            "hops_count": hops_count,
            "shrinkage_ratio": round(shrinkage_ratio, 3),
            "total_shrinkage": total_shrinkage,
            "shrinkage_count": shrinkage_count,
            "has_returns": has_returns,
            "return_ratio": round(return_ratio, 3),
            "recalled_returns": recalled_returns,
            "listing_count": listing_count,
            "max_discount": max_discount,
            "illicit_channel_detected": illicit_channel_detected,
            "is_dead_batch": is_dead_batch,
            "batch_status": getattr(batch.status, "value", str(batch.status)),
            "is_recalled": bool(getattr(batch, "is_recalled", False)),
        }


class PharmaSafeAIEngine:
    """Ensemble AI Risk and Anomaly Detection Model."""

    def __init__(self, model_version: str = MODEL_VERSION):
        self.model_version = model_version

    def evaluate_batch(
        self,
        features: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Synthesizes 5 sub-models into a holistic composite risk profile:
        1. Expiry Degradation Score
        2. Supply-Chain Movement Anomaly Score
        3. Quantity Leakage / Variance Score
        4. Re-Entry / Black Market Resale Threat Score
        5. Online Surveillance / Channel Vulnerability Score
        """
        reasons: List[str] = []
        anomalies: List[Dict[str, Any]] = []

        # ─── Sub-Model 1: Expiry Degradation ──────────────────────────────
        days_left = features["days_to_expiry"]
        fraction_elapsed = features["fraction_shelf_elapsed"]
        status = features["batch_status"]

        if days_left <= 0:
            expiry_risk = 1.0
            reasons.append(f"Statutory expiry reached ({abs(days_left)} days past expiry date).")
        else:
            # Accelerated exponential risk curve as expiry nears
            expiry_risk = min(1.0, math.pow(fraction_elapsed, 2.2))
            if days_left < 30:
                expiry_risk = max(expiry_risk, 0.85)
                reasons.append(f"Critical shelf-life degradation window ({days_left} days remaining).")
            elif days_left < 90:
                expiry_risk = max(expiry_risk, 0.55)
                reasons.append(f"Approaching near-expiry threshold ({days_left} days remaining).")
            
            # Additional penalty if still stuck in early distribution with tight shelf life
            if status in ["MANUFACTURED", "IN_DISTRIBUTION"] and days_left < 90:
                expiry_risk = min(1.0, expiry_risk + 0.25)
                reasons.append("Distribution bottleneck: batch remains in transit/depot near expiry.")

        # ─── Sub-Model 2: Movement & Custody Velocity ─────────────────────
        movement_risk = 0.05
        if features["speed_violation"]:
            movement_risk = 0.95
            reasons.append(f"Physically impossible transfer velocity ({features['max_speed_kmh']} km/h) - suspected GPS spoofing.")
            anomalies.append({
                "anomaly_type": "SPEED_GEO_JUMP",
                "severity": "CRITICAL",
                "description": f"Impossible ground transit velocity of {features['max_speed_kmh']} km/h detected between custody handoffs.",
                "raw_evidence": {"speed_kmh": features["max_speed_kmh"]}
            })
        elif features["dwell_bottleneck"]:
            movement_risk = 0.60
            reasons.append("Prolonged dwell time in forward distribution hub exceeds 14 days.")
            anomalies.append({
                "anomaly_type": "DWELL_TIME_ANOMALY",
                "severity": "MEDIUM",
                "description": "Stock stagnant in transit hub beyond 14 days normal distribution cycle.",
                "raw_evidence": {"status": status}
            })

        # ─── Sub-Model 3: Quantity Variance & Leakage ─────────────────────
        quantity_risk = 0.05
        shrink_ratio = features["shrinkage_ratio"]
        total_shrink = features["total_shrinkage"]
        if shrink_ratio > 0.02 or total_shrink >= 50:
            quantity_risk = min(1.0, 0.55 + shrink_ratio * 1.5)
            reasons.append(f"Supply chain shrinkage detected: {total_shrink} units missing ({round(shrink_ratio * 100, 1)}% variance).")
            anomalies.append({
                "anomaly_type": "QUANTITY_LEAKAGE",
                "severity": "HIGH" if (shrink_ratio > 0.10 or total_shrink >= 200) else "MEDIUM",
                "description": f"Cumulative discrepancy of {total_shrink} units missing across {features['shrinkage_count']} transfer handoffs.",
                "raw_evidence": {"total_shrinkage": total_shrink, "shrinkage_ratio": shrink_ratio}
            })
        elif total_shrink > 0:
            quantity_risk = 0.25
            reasons.append(f"Minor quantity discrepancy ({total_shrink} units) noted during transfer reconciliation.")

        # ─── Sub-Model 4: Re-Entry & Decommissioned Threat ────────────────
        reentry_risk = 0.05
        if features["is_dead_batch"]:
            reentry_risk = 1.0
            reasons.append("FATAL REGISTRY COLLISION: Batch is inscribed in the sovereign Dead Batch Registry as DESTROYED.")
            anomalies.append({
                "anomaly_type": "DEAD_BATCH_REENTRY_DETECTED",
                "severity": "CRITICAL",
                "description": "Batch officially certified as destroyed is active or scanned in circulation.",
                "raw_evidence": {"is_dead_batch": True}
            })
        elif status in ["DESTROYED", "DEAD_BATCH"]:
            reentry_risk = 1.0
            reasons.append("CRITICAL: Batch has been decommissioned as DESTROYED.")
        elif features["is_recalled"]:
            reentry_risk = 0.90
            reasons.append("HIGH: Active national recall directive issued against this batch.")
        elif status in ["RETURN_INITIATED", "RETURN_IN_TRANSIT", "RECEIVED_AT_DISPOSAL", "DISPOSED"]:
            reentry_risk = 0.75
            reasons.append("Elevated risk: batch is actively routed through reverse logistics return channels.")

        # ─── Sub-Model 5: Marketplace Surveillance & Grey Market ───────────
        listing_risk = 0.05
        if features["illicit_channel_detected"]:
            listing_risk = 0.95
            reasons.append("Online surveillance detected listings on unverified or dark-web e-commerce channels.")
            anomalies.append({
                "anomaly_type": "ILLICIT_CHANNEL_PRESENCE",
                "severity": "HIGH",
                "description": "Medicine batch surfaced on unverified peer-to-peer or Telegram distribution channels.",
                "raw_evidence": {"platform_listings": features["listing_count"]}
            })
        elif features["max_discount"] > 50.0:
            listing_risk = 0.70
            reasons.append(f"Anomalous e-commerce pricing ({round(features['max_discount'])}% discount below standard MRP).")
            anomalies.append({
                "anomaly_type": "ANOMALOUS_PRICE_DISCOUNT",
                "severity": "MEDIUM",
                "description": f"Steep discount of {round(features['max_discount'])}% indicates possible diverted or counterfeit inventory.",
                "raw_evidence": {"max_discount": features["max_discount"]}
            })
        elif features["listing_count"] > 0:
            listing_risk = 0.25

        # ─── Model Weights & Ensemble Combination ─────────────────────────
        # Invariant: If Dead Batch, composite is forced to 1.0 (Critical)
        if features["is_dead_batch"] or status in ["DESTROYED", "DEAD_BATCH"]:
            composite_score = 1.0
            risk_level = "CRITICAL"
        else:
            w_expiry = 0.25
            w_movement = 0.20
            w_quantity = 0.20
            w_reentry = 0.20
            w_listing = 0.15

            composite_score = (
                w_expiry * expiry_risk
                + w_movement * movement_risk
                + w_quantity * quantity_risk
                + w_reentry * reentry_risk
                + w_listing * listing_risk
            )
            composite_score = round(min(1.0, max(0.0, composite_score)), 3)

            if composite_score >= 0.75:
                risk_level = "HIGH"
            elif composite_score >= 0.40:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

        # Feature Attribution Weights Breakdown (SHAP-inspired)
        contributing_features = {
            "expiry_decay_weight": round(expiry_risk, 3),
            "transit_velocity_weight": round(movement_risk, 3),
            "quantity_shrinkage_weight": round(quantity_risk, 3),
            "reentry_threat_weight": round(reentry_risk, 3),
            "marketplace_divergence_weight": round(listing_risk, 3),
            "total_hops": features["hops_count"],
            "days_to_expiry": features["days_to_expiry"],
            "shrinkage_units": features["total_shrinkage"],
        }

        # Plain-English Executive Explanation
        if not reasons:
            reasons.append("Sovereign forward and reverse supply chain integrity fully verified. Normal operations.")

        summary = f"Composite AI Risk Index: {round(composite_score * 100)}/100 ({risk_level}). " + "; ".join(reasons[:2])

        return {
            "composite_risk_score": composite_score,
            "risk_level": risk_level,
            "expiry_risk_score": round(expiry_risk, 3),
            "movement_anomaly_score": round(movement_risk, 3),
            "quantity_anomaly_score": round(quantity_risk, 3),
            "reentry_risk_score": round(reentry_risk, 3),
            "seller_listing_risk_score": round(listing_risk, 3),
            "explanation_summary": summary,
            "reasons": reasons,
            "contributing_features": contributing_features,
            "anomalies_detected": anomalies,
            "model_version": self.model_version,
            "deterministic_safety_preserved": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


# Singleton engine instance
pharma_ai_engine = PharmaSafeAIEngine()
