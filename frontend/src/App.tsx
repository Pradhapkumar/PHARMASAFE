import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BatchPassportPage from './pages/BatchPassportPage';
import BatchRegisterPage from './pages/BatchRegisterPage';
import DistributorPage from './pages/DistributorPage';
import PharmacyVerifyPage from './pages/PharmacyVerifyPage';
import SaleVerificationPage from './pages/SaleVerificationPage';
import ReturnManagementPage from './pages/ReturnManagementPage';
import ChainOfCustodyPage from './pages/ChainOfCustodyPage';
import DisposalManagementPage from './pages/DisposalManagementPage';
import DestructionCertificatesPage from './pages/DestructionCertificatesPage';
import DeadBatchRegistryPage from './pages/DeadBatchRegistryPage';
import ReentryDetectionPage from './pages/ReentryDetectionPage';
import OnlineSafetyPage from './pages/OnlineSafetyPage';
import AiRiskPage from './pages/AiRiskPage';
import ExpiryIntelligencePage from './pages/ExpiryIntelligencePage';
import AlertCenterPage from './pages/AlertCenterPage';
import AuditTrailPage from './pages/AuditTrailPage';
import ComplianceDashboardPage from './pages/ComplianceDashboardPage';
import SettingsPage from './pages/SettingsPage';

import MedicineCataloguePage from './pages/MedicineCataloguePage';
import ManufacturerInventoryPage from './pages/ManufacturerInventoryPage';
import PharmacyDashboardPage from './pages/PharmacyDashboardPage';

import InvestigationsPage from './pages/InvestigationsPage';
import InvestigationDetailPage from './pages/InvestigationDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import GovAuthorizationPage from './pages/GovAuthorizationPage';
import PipelinePage from './pages/PipelinePage';
import SupplyChainBoardPage from './pages/SupplyChainBoardPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected App Shell Routes */}
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Forward Supply Chain & Manufacturer Portal */}
            <Route path="/medicines" element={<MedicineCataloguePage />} />
            <Route path="/manufacturer/inventory" element={<ManufacturerInventoryPage />} />
            <Route path="/batches/:batchId" element={<BatchPassportPage />} />
            <Route path="/batches/register" element={<BatchRegisterPage />} />
            <Route path="/register" element={<BatchRegisterPage />} />
            <Route path="/distributor" element={<DistributorPage />} />
            <Route path="/distributor/incoming" element={<DistributorPage />} />
            <Route path="/distributor/inventory" element={<DistributorPage />} />
            <Route path="/distributor/transfers" element={<DistributorPage />} />
            <Route path="/pharmacy" element={<PharmacyDashboardPage />} />
            <Route path="/pharmacy/incoming" element={<PharmacyDashboardPage />} />
            <Route path="/pharmacy/inventory" element={<PharmacyDashboardPage />} />
            <Route path="/pharmacy/verify" element={<PharmacyVerifyPage />} />
            <Route path="/verify" element={<PharmacyVerifyPage />} />
            <Route path="/sales" element={<SaleVerificationPage />} />

            {/* Reverse Chain & Destruction */}
            <Route path="/returns" element={<ReturnManagementPage />} />
            <Route path="/chain-of-custody" element={<ChainOfCustodyPage />} />
            <Route path="/disposal" element={<DisposalManagementPage />} />
            <Route path="/certificates" element={<DestructionCertificatesPage />} />

            {/* Anti-Re-Entry & Intelligence */}
            <Route path="/dead-batches" element={<DeadBatchRegistryPage />} />
            <Route path="/re-entry" element={<ReentryDetectionPage />} />
            <Route path="/online-safety" element={<OnlineSafetyPage />} />
            <Route path="/ai-risk" element={<AiRiskPage />} />
            <Route path="/expiry-intelligence" element={<ExpiryIntelligencePage />} />

            {/* Governance */}
            <Route path="/alerts" element={<AlertCenterPage />} />
            <Route path="/audit" element={<AuditTrailPage />} />
            <Route path="/compliance" element={<ComplianceDashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/investigations" element={<InvestigationsPage />} />
            <Route path="/investigations/:id" element={<InvestigationDetailPage />} />
            <Route path="/gov-auth" element={<GovAuthorizationPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/live-board" element={<SupplyChainBoardPage />} />
            <Route path="/supply-chain-board" element={<SupplyChainBoardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
