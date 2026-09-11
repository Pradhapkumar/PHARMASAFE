# PharmaSafe Intelligence — Phase 2 UI/UX Foundation & Design System

## Executive Overview
PharmaSafe Intelligence is an enterprise pharmaceutical reverse supply chain, compliance, and medicine safety platform designed to enforce drug disposal mandates, eliminate gray-market reselling of expired/recalled pharmaceuticals, and provide end-to-end chain of custody verification.

Phase 2 establishes a high-performance, command-center grade frontend foundation built with **React 18, TypeScript, Tailwind CSS v3.4, React Router DOM v6, Lucide React, and Recharts**. It introduces an interactive, multi-role user experience covering 6 regulatory and supply chain personas, 20 purpose-built application views, an interactive 22-step judge demo flow, and a centralized mock state store centered around the lifecycle of batch **`B1001` (Amoxicillin 500mg)**.

---

## 1. Persona & Role-Based UX Architecture
PharmaSafe Intelligence serves six distinct user groups across the pharmaceutical lifecycle. The frontend features instantaneous persona switching via a dedicated role switcher in the topbar and sidebar navigation.

| Persona | Role Key | Primary Responsibilities & Permissions | Default Landing View |
|---|---|---|---|
| **Regulatory Officer** | `REGULATOR` | National compliance oversight, Dead Batch Registry alerts, destruction certificate validation, marketplace takedowns | Compliance Dashboard (`/compliance`) |
| **Manufacturer Compliance Officer** | `MANUFACTURER` | Batch passport registration, recall management, reverse return authorization, custody audits | Batch Passport (`/passport/B1001`) |
| **Logistics / Warehouse Manager** | `DISTRIBUTOR` | Inbound intake, custody scans, quarantine sorting, tamper-evident transfer manifests | Distributor Logistics (`/distributor`) |
| **Pharmacy Quality Specialist** | `PHARMACY` | Dispensing verification, customer returns, expired medicine return manifests, recall lockouts | Pharmacy Verification (`/pharmacy-verify`) |
| **Disposal Facility Supervisor** | `DISPOSAL_FACILITY`| Secure incineration intake, destruction execution, EPA emission records, digital destruction certificates | Disposal Operations (`/disposal`) |
| **Consumer / Field Inspector** | `PUBLIC` | QR-code medicine safety lookup, counterfeit verification, public recall advisories | Public Safety Check (`/verify-sale`) |

---

## 2. Information Architecture & Navigation Tree
The interface is structured into 8 functional operational domains within a unified, responsive application shell:

```
PharmaSafe Enterprise Shell (AppShell)
├── 1. Overview & Command Center
│   ├── Executive Dashboard (/dashboard)
│   └── Regulatory Compliance Hub (/compliance)
├── 2. Core Batch Passport & Lifecycle
│   ├── Batch Passport 360° Inspection (/passport/:batchNumber)
│   └── Batch Registration & Minting (/batches)
├── 3. Supply Chain & Logistics Operations
│   ├── Distributor & Warehouse Receiving (/distributor)
│   ├── Pharmacy Verification & Quarantines (/pharmacy-verify)
│   └── Reverse Logistics & Returns (/returns)
├── 4. Custody & Secure Destruction
│   ├── End-to-End Chain of Custody (/custody)
│   ├── High-Temperature Disposal Facility (/disposal)
│   └── Tamper-Proof Destruction Certificates (/destruction-certificates)
├── 5. Anti-Diversion & Dead Batch Registry
│   ├── Official Dead Batch Registry (/dead-batch-registry)
│   └── Real-Time Re-Entry & Diversion Detection (/reentry-detection)
├── 6. Intelligence & Predictive AI
│   ├── AI Reverse Chain Risk Engine (/ai-risk)
│   ├── Expiry & Shelf-Life Intelligence (/expiry-intelligence)
│   └── E-Commerce & Web Surveillance (/online-safety)
├── 7. Audit & Surveillance Center
│   ├── Central Alert Command Center (/alerts)
│   └── Immutable Event Audit Trail (/audit-trail)
└── 8. Public Verification & Configuration
    ├── Public QR Medicine Verification (/verify-sale)
    └── System Settings & API Tokens (/settings)
```

---

## 3. UI/UX Design System Rationale
PharmaSafe adheres to a **Command-Center Dark Slate** visual design language tailored for mission-critical industrial compliance:
- **Palette Foundation:** Deep midnight slate backgrounds (`slate-950` / `#020617`, `slate-900` / `#0f172a`, `slate-800` / `#1e293b`) with high-legibility border contrasts (`slate-700/50` and `slate-800`).
- **Semantic Color Tokens:**
  - `EMERALD`: Verified, Legitimate, Safely Destroyed, Active In-Transit.
  - `AMBER`: Approaching Expiry (<60 days), In-Quarantine, Under Audit.
  - `ROSE / RED`: Counterfeit, Re-Entry Alert, Recalled, Expired, Tamper Detected.
  - `CYAN / SKY`: Digital Batch Passports, QR Cryptographic Signatures, AI Risk Signals.
  - `PURPLE / INDIGO`: Verified Destruction Certificates, EPA Emissions, Regulators.
- **Glassmorphism & Depth:** Translucent overlays (`bg-slate-900/80 backdrop-blur-md`) for headers, sticky toolbars, and inspection drawers.
- **Data Denseness with Clarity:** Tables feature sticky headers, badge indicators, monospace batch numbers, inline action buttons, and row-level inspection drawers.
- **Micro-Animations & Visual Cues:** Subtle hover elevations, pulsing warning rings on active diversion vectors, and animated progress steppers across custody handovers.

---

## 4. Complete 20-Page Inventory & Functional Scope

1. **Login & Persona Selector (`/login`):** Authentication gateway with one-click persona switching, role permission previews, and security audit badges.
2. **Executive Command Dashboard (`/dashboard`):** Real-time reverse logistics metrics, nationwide lifecycle donut charts, 6-month risk trendlines, high-priority alerts, and critical batch watchlists.
3. **Digital Batch Passport (`/passport/:batchNumber`):** 360-degree digital twin for pharmaceutical batches (e.g. `B1001`), showcasing chemical formulation, manufacturer origin, serial distribution, cryptographic QR, and end-to-end timeline.
4. **Batch Register & Minting (`/batches`):** Master manufacturer batch registry with search, status filters, and modal for minting new batch passports with NDC codes and initial custody bindings.
5. **Distributor Receiving & Logistics (`/distributor`):** Warehouse dock intake, custody scan validations, cold-chain temperature telemetry, and outbound transfer manifest issuance.
6. **Pharmacy Verification & Dispensing (`/pharmacy-verify`):** Point-of-dispense verification tool, anti-counterfeit scanning, expiration lockout guards, and customer return triage.
7. **Point-of-Sale Public Medicine Safety (`/verify-sale`):** Clean, consumer-accessible lookup portal supporting mock QR scanning, batch authenticity checks, and counterfeit alert banners.
8. **Reverse Logistics & Returns Management (`/returns`):** Multi-tier return authorizations, return reason codes (expired, recalled, damaged, slow-moving), RMA generators, and shipment tracking.
9. **Chain of Custody & Traceability (`/custody`):** Cryptographically verifiable chronological transfer ledger tracking custody transitions between Manufacturers, Carriers, Distributors, Pharmacies, and Waste Facilities.
10. **High-Temperature Disposal Management (`/disposal`):** Waste treatment intake, weight-scale verifications, hazardous waste classification, and hazardous incinerator chamber dispatch.
11. **Tamper-Proof Destruction Certificates (`/destruction-certificates`):** Regulatory certificates of destruction featuring SHA-256 cryptographic verification hashes, EPA facility IDs, witness sign-offs, and printable PDF preview drawers.
12. **National Dead Batch Registry (`/dead-batch-registry`):** Sovereign ledger of permanently retired, destroyed, or recalled medicine batches legally prohibited from commercial resale or distribution.
13. **Re-Entry & Diversion Detection Engine (`/reentry-detection`):** Real-time anomaly detection identifying black-market resale attempts, geographic geo-fence breaks, and duplicate serial scans.
14. **Online Pharmacy & Web Surveillance (`/online-safety`):** Dark-web and unlicensed e-commerce crawler monitoring illegal listings of dead batches, automated scraping detections, and takedown notice dispatchers.
15. **AI Reverse Chain Risk Engine (`/ai-risk`):** Machine learning risk scoring (0-100) evaluating diversion vulnerability, manufacturer recall anomalies, and reverse transit delays.
16. **Expiry & Inventory Shelf-Life Intelligence (`/expiry-intelligence`):** Predictive stock aging models, dynamic discount recommendations for near-expiry items, and automated return-trigger thresholds.
17. **Central Alert & Incident Command (`/alerts`):** Unified operational notification hub with severity triage (Critical, High, Medium, Low), acknowledgment workflows, and escalation routing.
18. **Immutable Audit Trail (`/audit-trail`):** Comprehensive event log recording user identity, IP address, timestamp, action type, and cryptographic payload delta for full 21 CFR Part 11 compliance.
19. **Regulatory Compliance Hub (`/compliance`):** High-level regulatory oversight dashboard for health agencies, displaying regional compliance scores, disposal mandate audit statistics, and enforcement action buttons.
20. **System Settings & Integrations (`/settings`):** Platform configuration, mock environment toggles, notification preferences, simulated API keys, and demo data reset tools.

---

## 5. Centralized Mock State Architecture
All 20 views consume a unified in-memory data store defined in `src/mocks/mockData.ts` and interfaced via strongly typed services:
- **Zero Phase 3 Backend Bleed:** All state operations (status transitions, return creations, certificate issuances, alert acknowledgments) update the reactive mock state cleanly without relying on mock endpoints or active databases.
- **Cross-Component Reactivity:** Modifications in one module (e.g. creating a return for `B1001` or flagging `B1001` in the Dead Batch Registry) immediately reflect in the Executive Dashboard, Batch Passport, and Audit Trail.
- **Judge Walkthrough Stepper:** An integrated floating guide component (`DemoScenarioGuide.tsx`) provides judges and evaluators with a 15-to-22 step interactive narrative tracing `B1001` from manufacturing to illegal diversion detection and verified disposal.
