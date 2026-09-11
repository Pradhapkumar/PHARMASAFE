# Forward Supply Chain Cryptographic Custody Protocol

```mermaid
flowchart TD
    subgraph Manufacturer["1. Pharmaceutical Manufacturer"]
        M1[Register Medicine] --> M2[Mint Batch B1001]
        M2 --> M3[Generate GS1 QR & Digital Passport]
        M3 --> M4[Dispatch Consignment to Wholesale]
    end

    subgraph Distributor["2. Wholesale Logistics Depot"]
        D1[Inbound Physical Count Verification] --> D2{Variance Check}
        D2 -->|Match| D3[Sign Digital Custody Handshake]
        D2 -->|Variance| D4[Auto-Raise QUANTITY_DISCREPANCY Alert]
        D4 --> D3
        D3 --> D5[Depot Warehouse Storage]
        D5 --> D6[Dispatch Outbound Route to Pharmacy]
    end

    subgraph Pharmacy["3. Point-of-Care Dispensary"]
        P1[Inbound Delivery Intake] --> P2[Verify Physical Strips/Boxes]
        P2 --> P3[Custody Transferred to Pharmacy Ledger]
        P3 --> P4[Dispensary Shelf Inventory]
        P4 --> P5[Point-of-Care Barcode Verification]
        P5 --> P6{Safe to Dispense?}
        P6 -->|Authentic| P7[Authorize Point-of-Sale Sale]
        P6 -->|Expired / Recalled| P8[Quarantine for Reverse Chain Return]
    end

    M4 ==>|stage: MANUFACTURE_TO_DISTRIBUTOR| D1
    D6 ==>|stage: DISTRIBUTOR_TO_PHARMACY| P1
```

## Milestone Identity & Audit Immutability

Every forward transfer updates the single, unified Digital Batch Passport for `B1001`:

| Milestone Stage | Actor Role | Triggered By | Digital Batch Passport Output |
|---|---|---|---|
| `MANUFACTURED` | Manufacturer | Batch Registration | Genesis block created with formulation metadata and GTIN barcode |
| `MANUFACTURE_TO_DISTRIBUTOR` | Manufacturer | Depot Dispatch | Outbound manifest created with carrier details |
| `DISTRIBUTOR_RECEIVED` | Distributor | Intake Reconciliation | Physical count verified, custody transferred to wholesale depot |
| `DISTRIBUTOR_TO_PHARMACY` | Distributor | Pharmacy Dispatch | Depot stock decremented, downstream consignment transit logged |
| `PHARMACY_RECEIVED` | Pharmacy | Physical Intake | Consignment verified by pharmacist, stock placed on dispensary shelf |
