import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, CheckCircle2, ChevronRight, ChevronDown, 
  RotateCcw, ShieldAlert, Sparkles, ExternalLink 
} from 'lucide-react';
import { demoState } from '../../mocks/mockData';

interface DemoStep {
  step: number;
  title: string;
  route: string;
  roleHint: string;
  description: string;
  actionLabel?: string;
  onExecute?: () => void;
}

export const DemoScenarioGuide: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(demoState.currentStep);

  const steps: DemoStep[] = [
    {
      step: 1,
      title: 'Batch Registration (B1001)',
      route: '/batches/register',
      roleHint: 'Manufacturer',
      description: 'Manufacturer catalogs Batch B1001 (Paracetamol 500mg, 1000 boxes, expiry 30/09/2026) and generates cryptographic QR payload.',
      actionLabel: 'Go to Registration',
    },
    {
      step: 2,
      title: 'Digital Batch Passport',
      route: '/batches/B1001',
      roleHint: 'Any Role',
      description: 'View digital batch passport for B1001: active status, forward custody trail, unbroken digital signatures.',
      actionLabel: 'View Passport',
    },
    {
      step: 3,
      title: 'Distributor Intake & Inventory',
      route: '/distributor',
      roleHint: 'Distributor',
      description: 'Apollo Logistics receives and verifies wholesale shipment. Custody handshake logged.',
      actionLabel: 'Inspect Distributor Hub',
    },
    {
      step: 4,
      title: 'Pharmacy Scan & Verification',
      route: '/verify',
      roleHint: 'Pharmacy',
      description: 'Pharmacist scans B1001 at retail intake. Status confirms: VERIFIED / AUTHENTIC. Sale permitted.',
      actionLabel: 'Simulate Pharmacy Scan',
    },
    {
      step: 5,
      title: 'Point-of-Sale Authorization Check',
      route: '/sales',
      roleHint: 'Pharmacy',
      description: 'Checkout scan passes automated safety check: ALLOW SALE.',
      actionLabel: 'View Point-of-Sale',
    },
    {
      step: 6,
      title: 'Simulate Expiry Date Passed',
      route: '/verify',
      roleHint: 'System Trigger',
      description: 'Simulate batch exceeding expiry date. Engage automated point-of-sale lock.',
      actionLabel: 'Trigger Expiry State',
      onExecute: () => {
        demoState.b1001Status = 'EXPIRED';
        demoState.b1001Expiry = '2024-08-30';
      },
    },
    {
      step: 7,
      title: 'Sale Blocked & Quarantine Alert',
      route: '/sales',
      roleHint: 'Pharmacy',
      description: 'Scan expired B1001 at checkout. UI triggers: SALE BLOCKED with required return action.',
      actionLabel: 'Inspect Sale Block',
    },
    {
      step: 8,
      title: 'Reverse Return Request Initiated',
      route: '/returns',
      roleHint: 'Pharmacy',
      description: 'Pharmacy registers reverse logistics manifest for expired stock to GreenShield disposal.',
      actionLabel: 'View Returns',
      onExecute: () => {
        demoState.isB1001Returned = true;
        demoState.b1001Status = 'RETURN_INITIATED';
      },
    },
    {
      step: 9,
      title: 'Reverse Custody Transit',
      route: '/chain-of-custody',
      roleHint: 'Distributor',
      description: 'Reverse courier transfers custody from Pharmacy -> Distributor -> Disposal site with GPS checkpoint.',
      actionLabel: 'View Custody Graph',
      onExecute: () => {
        demoState.b1001Status = 'RETURN_IN_TRANSIT';
      },
    },
    {
      step: 10,
      title: 'Disposal Facility Verification',
      route: '/disposal',
      roleHint: 'Disposal Facility',
      description: 'GreenShield bio-hazard facility verifies sealed pallet intake and records gross weight.',
      actionLabel: 'View Disposal Intake',
      onExecute: () => {
        demoState.b1001Status = 'RECEIVED_AT_DISPOSAL';
      },
    },
    {
      step: 11,
      title: 'Certified Thermal Destruction',
      route: '/certificates',
      roleHint: 'Disposal Facility',
      description: 'Dual witnesses certify physical incineration at 1200°C. Cryptographic SHA-256 certificate issued.',
      actionLabel: 'Generate Certificate',
      onExecute: () => {
        demoState.isB1001Destroyed = true;
        demoState.isB1001InDeadRegistry = true;
        demoState.b1001Status = 'DESTROYED';
        demoState.destructionCertHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      },
    },
    {
      step: 12,
      title: 'Inscription in Dead Batch Registry',
      route: '/dead-batches',
      roleHint: 'Regulator / All',
      description: 'Destroyed batch B1001 is permanently inscribed in Dead Batch Registry. Circulating stock banned worldwide.',
      actionLabel: 'Inspect Dead Registry',
    },
    {
      step: 13,
      title: 'Marketplace Surveillance Detects B1001',
      route: '/online-safety',
      roleHint: 'AI Surveillance',
      description: 'Web crawler detects Telegram gray market listing offering batch B1001 at 75% discount.',
      actionLabel: 'View Online Safety Feed',
      onExecute: () => {
        demoState.reentryDetected = true;
      },
    },
    {
      step: 14,
      title: '🚨 CRITICAL: POSSIBLE RE-ENTRY (98% Risk)',
      route: '/re-entry',
      roleHint: 'Regulator / Security',
      description: 'System correlates listing against Dead Batch Registry: 98% Risk. Immediate takedown and freeze action.',
      actionLabel: 'View Re-Entry Intelligence',
    },
    {
      step: 15,
      title: 'Audit Trail & Regulator Oversight',
      route: '/audit',
      roleHint: 'Regulator',
      description: 'Immutable timeline records every state change, certificate hash, and re-entry interception.',
      actionLabel: 'Inspect Audit Trail',
    },
  ];

  const handleStepClick = (s: DemoStep) => {
    setActiveStep(s.step);
    demoState.currentStep = s.step;
    if (s.onExecute) s.onExecute();
    navigate(s.route);
  };

  const currentStepData = steps.find(s => s.step === activeStep) || steps[0];

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm sm:max-w-md w-full">
      {/* Minimized Pill */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-105 transition-all"
        >
          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
          <span>Judge Walkthrough Guide (Step {activeStep}/{steps.length})</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Expanded Walkthrough Card */}
      {isOpen && (
        <div className="glass-panel p-5 rounded-2xl border border-cyan-500/40 shadow-2xl bg-slate-950/95 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Judge Demo Story: Batch B1001
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  Step {activeStep} of {steps.length} • {currentStepData.roleHint}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="my-3">
            <h5 className="text-sm font-bold text-cyan-300 mb-1">
              {currentStepData.title}
            </h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                const prev = Math.max(1, activeStep - 1);
                handleStepClick(steps[prev - 1]);
              }}
              disabled={activeStep === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-400 disabled:opacity-40 hover:text-white"
            >
              Back
            </button>

            <button
              onClick={() => handleStepClick(currentStepData)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              <span>{currentStepData.actionLabel || 'Execute Step'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                const next = Math.min(steps.length, activeStep + 1);
                handleStepClick(steps[next - 1]);
              }}
              disabled={activeStep === steps.length}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-400 disabled:opacity-40 hover:text-white"
            >
              Next
            </button>
          </div>

          {/* Direct Step Jump Bar */}
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Scenario: Closed-Loop Traceability</span>
            <button
              onClick={() => {
                demoState.b1001Status = 'AT_PHARMACY';
                demoState.b1001Expiry = '2026-09-30';
                demoState.isB1001Returned = false;
                demoState.isB1001Destroyed = false;
                demoState.isB1001InDeadRegistry = false;
                demoState.reentryDetected = false;
                demoState.destructionCertHash = null;
                handleStepClick(steps[0]);
              }}
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Flow</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoScenarioGuide;
