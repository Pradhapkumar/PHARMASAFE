# PharmaSafe Intelligence — 22-Step Judge Demonstration Flow

## Master Demo Narrative: The Complete Lifecycle of Batch `B1001`
This document outlines the canonical 22-step evaluation flow showcasing PharmaSafe Intelligence. The scenario tracks **Batch `B1001` (Amoxicillin 500mg, 10,000 units)** through its initial manufacturing, legal distribution, return due to expiration, authorized high-temperature incineration, cryptographic destruction certification, entry into the Dead Batch Registry, and an automated interception of an attempted black-market resale.

Judges can execute this walkthrough sequentially using the floating **Interactive Demo Guide** widget in the bottom-right corner of the screen or navigate manually using the routes and persona switcher.

---

## The 22-Step Demonstration Matrix

| Step # | Stage Name | Active Persona | Target Route | Interactive Action / Validation Point |
|---|---|---|---|---|
| **01** | **Persona Authentication** | `MANUFACTURER` | `/login` | Log in as **Elena Rostova** (Manufacturer Compliance Lead). Verify persona badge in the topbar. |
| **02** | **Batch Passport Inspection** | `MANUFACTURER` | `/passport/B1001` | Inspect 360° Digital Batch Passport for `B1001`. Review NDC code, chemical potency, and cryptographic QR code. |
| **03** | **Batch Registration & Minting** | `MANUFACTURER` | `/batches` | Click "+ Mint Batch Passport", enter new batch details (`B1006`), and review immediate ledger addition. |
| **04** | **Distributor Dock Intake** | `DISTRIBUTOR` | `/distributor` | Switch to **Marcus Vance** (Apex Logistics). Inspect inbound shipment for `B1001`, verify cold-chain logger (4.2°C), and approve dock intake. |
| **05** | **Pharmacy Receiving** | `PHARMACY` | `/pharmacy-verify` | Switch to **Dr. Priya Sharma** (MediCare Pharmacy). Scan `B1001` barcode; system validates authenticity and clears batch for dispensing. |
| **06** | **Point-of-Sale Dispensing** | `PUBLIC` | `/verify-sale` | Switch to **Alex Chen** (Consumer / Patient). Simulate QR camera scan of `B1001`; receive green "Authentic & Safe for Dispense" badge. |
| **07** | **Expiry & Risk Intelligence** | `PHARMACY` | `/expiry-intelligence` | Switch to **Dr. Priya Sharma**. Review predictive stock shelf-life; system flags remaining unsold `B1001` units entering critical expiry window (<30 days). |
| **08** | **Reverse Return Initiation** | `PHARMACY` | `/returns` | Click "Initiate Reverse Return", select `B1001` (420 expired units), choose reason code `EXPIRED_RECALL`, and generate RMA `#RMA-2026-0881`. |
| **09** | **Reverse Logistics Handover** | `DISTRIBUTOR` | `/returns` | Switch to **Marcus Vance**. Authorize reverse transport manifest, attach tamper-evident seal `SEAL-99214-X`, and dispatch to regional reverse hub. |
| **10** | **Regional Quarantine Intake** | `DISTRIBUTOR` | `/custody` | Open Chain of Custody ledger; verify new custody transaction entry registering `B1001` in quarantine transit. |
| **11** | **Disposal Facility Weigh-In** | `DISPOSAL_FACILITY` | `/disposal` | Switch to **Tom Briggs** (EcoDestruct Supervisor). Receive `B1001` reverse crate, perform digital scale tare weigh-in (42.5 kg), and verify manifest weight match. |
| **12** | **Controlled Incineration** | `DISPOSAL_FACILITY` | `/disposal` | Dispatch `B1001` into High-Temperature Rotary Kiln Chamber 02 (1,250°C). Monitor EPA emission sensor telemetry (0.02 mg/m³ particulate). |
| **13** | **Destruction Certificate Minting**| `DISPOSAL_FACILITY` | `/destruction-certificates` | Issue tamper-proof Certificate of Destruction `COD-2026-0091`. Confirm digital dual-signatures (Facility Operator + EPA Inspector). |
| **14** | **Cryptographic Hash Verification**| `REGULATOR` | `/destruction-certificates` | Switch to **Sarah Jenkins** (Chief Regulatory Officer). Open certificate drawer; verify SHA-256 hash match (`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`). |
| **15** | **Dead Batch Registry Entry** | `REGULATOR` | `/dead-batch-registry` | Inscribe `B1001` into the sovereign Dead Batch Registry. Status permanently updates to `PERMANENTLY_DEAD / DESTROYED`. |
| **16** | **Simulated Re-Entry Attempt** | `PUBLIC` | `/verify-sale` | Attempt simulated point-of-sale lookup or customer return for `B1001`. System throws red alert: `CRITICAL: DEAD BATCH RESALE PROHIBITED`. |
| **17** | **Real-Time Diversion Flagging** | `REGULATOR` | `/reentry-detection` | Switch to **Sarah Jenkins**. Real-time alert triggers showing an unauthorized scan of `B1001` at an unapproved flea market/unlicensed vendor in Detroit, MI. |
| **18** | **Web Crawler Listing Detection**| `REGULATOR` | `/online-safety` | E-Commerce surveillance crawler detects illegal listing for `B1001` on gray-market portal `pharma-discount-direct.to`. |
| **19** | **Regulatory Takedown Dispatch** | `REGULATOR` | `/online-safety` | Click "Issue Automated Takedown Notice" & freeze listing; trigger immediate ICANN / ISP abuse dispatch. |
| **20** | **AI Reverse Chain Risk Engine** | `REGULATOR` | `/ai-risk` | Open AI Risk dashboard; view post-incident anomaly score update for distributor route and flagged diversion risk hotspots. |
| **21** | **Immutable Audit Trail** | `REGULATOR` | `/audit-trail` | Inspect tamper-proof audit trail ledger; verify complete chronological record from batch birth to destruction and diversion interception. |
| **22** | **National Compliance Command** | `REGULATOR` | `/compliance` | View national compliance metrics: 99.4% disposal mandate compliance, 42 active dead batches registered, and 0 undetected leaks. |

---

## Judge Evaluation Instructions & Reset Mechanism
1. **Interactive Demo Guide:** The floating widget at the bottom right allows stepping forward (`Next Step`) and backward (`Prev Step`) at any time. Clicking "Jump to Step" immediately sets the persona and navigates to the exact page.
2. **Instant Demo Reset:** To reset the demo state to initial defaults, click the **Reset Demo State** button in the floating guide or navigate to **Settings (`/settings`)** and click **"Reset Demo Data Store"**.
3. **Responsive Testing:** Shrink the viewport to tablet or mobile dimensions to observe the responsive drawer navigation, collapsible KPI cards, and touch-optimized action buttons.
