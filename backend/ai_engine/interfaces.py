from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import date

class IExpiryPredictor(ABC):
    @abstractmethod
    def predict_degradation_risk(
        self,
        mfg_date: date,
        expiry_date: date,
        current_date: date,
        current_stage: str,
        transit_delay_days: int = 0
    ) -> Dict[str, Any]:
        """
        Calculates expiry risk score (0.0 - 1.0) and remaining shelf life health.
        """
        pass

class IAnomalyDetector(ABC):
    @abstractmethod
    def detect_custody_anomalies(
        self,
        transfer_history: List[Dict[str, Any]],
        expected_route_kms: float = 100.0
    ) -> List[Dict[str, Any]]:
        """
        Detects route diversion, unrealistic velocity, and quantity discrepancies.
        """
        pass

class IReEntryRiskScorer(ABC):
    @abstractmethod
    def evaluate_reentry_risk(
        self,
        batch_status: str,
        is_in_dead_registry: bool,
        scanned_location: Optional[Dict[str, float]] = None,
        discrepancy_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates the probability (0.0 - 1.0) that a batch is an illegal re-entry of expired/dead stock.
        """
        pass

class IListingSurveillanceEngine(ABC):
    @abstractmethod
    def analyze_online_listing(
        self,
        platform_name: str,
        seller_name: str,
        extracted_batch_number: Optional[str],
        listed_price: Optional[float],
        market_average_price: Optional[float],
        is_dead_batch: bool
    ) -> Dict[str, Any]:
        """
        Calculates counterfeit / illegal listing risk for gray market medicines.
        """
        pass
