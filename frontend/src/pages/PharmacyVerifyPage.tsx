import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  QrCode, Search, ShieldCheck, AlertTriangle, XCircle, 
  Skull, AlertOctagon, ArrowRight, ShieldAlert, Sparkles, RefreshCw,
  Camera, CameraOff, Upload, CheckCircle2, FileImage, Zap, Volume2, VolumeX, Eye
} from 'lucide-react';
import jsQR from 'jsqr';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import batchService from '../services/batchService';
import { VerificationScanResult } from '../types/api';

export const PharmacyVerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('batch') || 'B1001';

  // Input & Verification States
  const [scannedInput, setScannedInput] = useState(initialCode);
  const [scanResult, setScanResult] = useState<VerificationScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState<VerificationScanResult[]>([]);

  // Real Camera Scanner States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedRaw, setLastScannedRaw] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sound beep synthesizer using Web Audio API
  const playScanBeep = (isSuccess: boolean = true) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (isSuccess) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // low buzz
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // AudioContext unavailable or blocked by autoplay policy
    }
  };

  // Perform Authoritative Verification Scan
  const handleScan = async (codeToVerify?: string) => {
    const code = (codeToVerify !== undefined ? codeToVerify : scannedInput).trim();
    if (!code) return;
    setIsScanning(true);
    try {
      const res = await batchService.verifyMedicineScan(code);
      setScanResult(res);
      setLastScannedRaw(code);
      setScanHistory(prev => [res, ...prev.filter(s => s.scan_id !== res.scan_id)].slice(0, 10));
      playScanBeep(res.verification_status === 'AUTHENTIC');
    } catch (err: any) {
      console.error('Verification scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-run initial verification on mount
  useEffect(() => {
    handleScan(initialCode);
  }, []);

  // Real Camera Stream Handling
  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        startDecodingLoop();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in your browser.'
          : 'No camera hardware found or video stream blocked. Use manual batch ID input or upload an image.'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Continuous Camera QR Decoding Loop
  const startDecodingLoop = () => {
    const checkFrame = () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // 1. Try decoding with jsQR
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrCode && qrCode.data) {
            const raw = qrCode.data.trim();
            if (raw && raw !== lastScannedRaw) {
              setScannedInput(raw);
              handleScan(raw);
              // Pause slightly to avoid duplicate consecutive reads
              setTimeout(() => {
                if (isCameraActive) {
                  animFrameIdRef.current = requestAnimationFrame(checkFrame);
                }
              }, 1500);
              return;
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(checkFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(checkFrame);
  };

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Upload & Decode Image File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            const decoded = code.data.trim();
            setScannedInput(decoded);
            handleScan(decoded);
          } else {
            // If direct QR pattern not found, check if filename matches batch ID or alert
            const nameMatch = file.name.toUpperCase().match(/(B\d{4}|AMX-[^\s.]+|AZT-[^\s.]+|RMD-[^\s.]+|PAR-[^\s.]+)/);
            if (nameMatch) {
              setScannedInput(nameMatch[0]);
              handleScan(nameMatch[0]);
            } else {
              alert('Could not detect a valid GS1 QR code in the uploaded image. Please ensure the QR code is clear and unobstructed, or type the Batch ID directly.');
            }
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Point-of-Care Medicine Verification Scanner"
        description="Instant barcode and cryptographic QR authentication cross-referenced against the National PharmaSafe Ledger and Dead Batch Registry"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
            MedPlus Pharmacy Dispensing Console • Optical Scanner v2.4
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs transition-colors flex items-center gap-1.5 ${
                soundEnabled 
                  ? 'bg-slate-900 border-slate-700 text-cyan-400 hover:text-cyan-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
              title={soundEnabled ? 'Mute Scan Sound' : 'Enable Scan Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => handleScan()}
              disabled={isScanning}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Re-run verification scan"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner Optical Terminal Interface */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Optical Scanner Terminal</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isCameraActive 
                  ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400 animate-pulse' 
                  : 'bg-slate-900 border border-slate-800 text-cyan-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isCameraActive ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                <span>{isCameraActive ? 'LIVE CAMERA STREAM' : 'LIVE OPTICS READY'}</span>
              </span>
            </div>
          </div>

          {/* Scanner Viewfinder Box with Real Video & Canvas */}
          <div className="relative aspect-square w-full rounded-2xl bg-slate-950 border border-slate-700/80 flex flex-col items-center justify-center text-center overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
            {/* Live Camera Video Feed */}
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              playsInline
              muted
            />

            {/* Hidden Offscreen Canvas for Frame Extraction */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder Target Reticle */}
            <div className="absolute inset-8 border-2 border-dashed border-cyan-500/40 rounded-xl pointer-events-none z-10" />
            <div className="absolute top-8 left-8 w-5 h-5 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
            <div className="absolute top-8 right-8 w-5 h-5 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-10" />
            <div className="absolute bottom-8 left-8 w-5 h-5 border-b-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
            <div className="absolute bottom-8 right-8 w-5 h-5 border-b-2 border-r-2 border-cyan-400 pointer-events-none z-10" />

            {/* Scanning Laser Sweep Animation */}
            {(isScanning || isCameraActive) && (
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#06b6d4] animate-pulse z-10 top-1/2 -translate-y-1/2" />
            )}

            {/* Placeholder Visual when Camera is Inactive */}
            {!isCameraActive && (
              <div className="p-6 flex flex-col items-center justify-center z-0">
                <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <QrCode className="w-8 h-8" />
                </div>
                <span className="text-xs font-mono text-slate-300 font-bold block">
                  {isScanning ? 'Decoding payload...' : 'Align GS1 QR or Barcode'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Point webcam at medicine packaging or select scenario below
                </span>
              </div>
            )}

            {/* Camera Overlay Controls */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20">
              {isCameraActive ? (
                <button
                  onClick={stopCamera}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/90 text-white text-xs font-mono font-bold hover:bg-rose-500 flex items-center gap-1.5 shadow-lg backdrop-blur-sm"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-mono font-bold hover:bg-cyan-400 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Start Live Camera</span>
                </button>
              )}

              <label className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 text-xs font-mono font-semibold hover:text-white hover:border-cyan-500/50 flex items-center gap-1.5 cursor-pointer backdrop-blur-sm">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload QR Image</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Camera Error Message */}
          {cameraError && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 text-[11px] text-amber-300 leading-relaxed">
              ⚠️ {cameraError}
            </div>
          )}

          {/* Manual / Barcode Input */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-mono uppercase text-slate-400">
              Scanned Payload / Batch Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={scannedInput}
                onChange={e => {
                  setScannedInput(e.target.value);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleScan();
                }}
                placeholder="Enter Batch ID (e.g. B1001)..."
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
              />
              <button
                onClick={() => handleScan()}
                disabled={isScanning}
                className="px-4 py-2 bg-cyan-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {isScanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Scan & Verify</span>
              </button>
            </div>
          </div>

          {/* Preset Test Scenarios */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Quick Test Verification Scenarios:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-medium font-mono">
              <button
                onClick={() => { setScannedInput('B1001'); handleScan('B1001'); }}
                className={`p-2 rounded-xl border transition-all text-left truncate flex items-center justify-between ${
                  scannedInput === 'B1001'
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400'
                }`}
              >
                <span>✓ B1001 (Authentic)</span>
              </button>
              <button
                onClick={() => { setScannedInput('B1003'); handleScan('B1003'); }}
                className={`p-2 rounded-xl border transition-all text-left truncate flex items-center justify-between ${
                  scannedInput === 'B1003'
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'bg-slate-900 border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-400'
                }`}
              >
                <span>⚠️ B1003 (Expired)</span>
              </button>
              <button
                onClick={() => { setScannedInput('B1004'); handleScan('B1004'); }}
                className={`p-2 rounded-xl border transition-all text-left truncate flex items-center justify-between ${
                  scannedInput === 'B1004'
                    ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 font-bold shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                    : 'bg-slate-900 border-slate-800 hover:border-rose-500/50 text-slate-300 hover:text-rose-400'
                }`}
              >
                <span>⛔ B1004 (Recalled)</span>
              </button>
              <button
                onClick={() => { setScannedInput('B9001'); handleScan('B9001'); }}
                className={`p-2 rounded-xl border transition-all text-left truncate flex items-center justify-between ${
                  scannedInput === 'B9001'
                    ? 'bg-red-950/80 border-red-500/60 text-red-300 font-bold shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                    : 'bg-slate-900 border-slate-800 hover:border-red-500/50 text-slate-300 hover:text-red-400'
                }`}
              >
                <span>💀 B9001 (Dead Batch)</span>
              </button>
            </div>

            {/* Additional Seed Aliases */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                onClick={() => { setScannedInput('AMX-2026-001'); handleScan('AMX-2026-001'); }}
                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-mono text-slate-400 hover:text-cyan-300"
              >
                AMX-2026-001
              </button>
              <button
                onClick={() => { setScannedInput('AZT-2025-EXP'); handleScan('AZT-2025-EXP'); }}
                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-[10px] font-mono text-slate-400 hover:text-amber-300"
              >
                AZT-2025-EXP
              </button>
              <button
                onClick={() => { setScannedInput('RMD-2026-REC'); handleScan('RMD-2026-REC'); }}
                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-[10px] font-mono text-slate-400 hover:text-rose-300"
              >
                RMD-2026-REC
              </button>
              <button
                onClick={() => { setScannedInput('FAKE_UNREGISTERED_999'); handleScan('FAKE_UNREGISTERED_999'); }}
                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-red-500/40 text-[10px] font-mono text-slate-400 hover:text-red-300"
              >
                FAKE_BARCODE
              </button>
            </div>
          </div>
        </div>

        {/* Verification Outcome & Digital Passport Decision Panel */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Verification Ledger Decision
                </h3>
                <span className="text-[11px] text-slate-500">
                  Authoritative cryptographic decision cross-referenced with National PharmaSafe Ledger
                </span>
              </div>
              {scanResult && (
                <span className="text-[11px] font-mono text-slate-400">
                  Scan Audit Ref: <strong className="text-cyan-400 font-bold">{scanResult.scan_id}</strong>
                </span>
              )}
            </div>

            {scanResult ? (
              <div className="space-y-6">
                {/* Main Outcome Callout */}
                <div className={`p-6 rounded-2xl border transition-all ${
                  scanResult.verification_status === 'AUTHENTIC'
                    ? 'bg-gradient-to-r from-emerald-950/50 to-slate-900/60 border-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.15)]'
                    : scanResult.verification_status === 'EXPIRED'
                    ? 'bg-gradient-to-r from-amber-950/50 to-slate-900/60 border-amber-500/60 shadow-[0_0_35px_rgba(245,158,11,0.15)]'
                    : scanResult.verification_status === 'RECALLED'
                    ? 'bg-gradient-to-r from-rose-950/50 to-slate-900/60 border-rose-500/60 shadow-[0_0_35px_rgba(244,63,94,0.15)]'
                    : 'bg-gradient-to-r from-red-950/70 to-slate-900/70 border-red-500/70 shadow-[0_0_40px_rgba(239,68,68,0.25)]'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950/80 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner">
                      {scanResult.verification_status === 'AUTHENTIC' ? (
                        <ShieldCheck className="w-8 h-8 text-emerald-400" />
                      ) : scanResult.verification_status === 'DEAD_BATCH_REENTRY_DETECTED' ? (
                        <Skull className="w-8 h-8 text-red-400 animate-pulse" />
                      ) : scanResult.verification_status === 'RECALLED' ? (
                        <AlertOctagon className="w-8 h-8 text-rose-400" />
                      ) : (
                        <AlertTriangle className="w-8 h-8 text-amber-400" />
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={scanResult.verification_status} size="lg" />
                        {scanResult.verification_status === 'AUTHENTIC' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-300 font-mono bg-emerald-950/80 border border-emerald-500/40">
                            ✓ VERIFIED AUTHENTIC • SAFE FOR PATIENT DISPENSING
                          </span>
                        )}
                        {scanResult.is_dead_batch_reentry && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-red-300 font-mono bg-red-950/90 border border-red-500/60 animate-pulse">
                            🚨 CRITICAL DEAD BATCH RE-ENTRY BREACH
                          </span>
                        )}
                      </div>

                      <h4 className="text-xl font-black text-white tracking-tight pt-0.5">
                        {scanResult.brand_name || 'Unregistered Substance'}
                      </h4>

                      {scanResult.warning_message ? (
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-rose-800/80 text-xs font-semibold text-rose-300 leading-relaxed mt-2">
                          ⚠️ {scanResult.warning_message}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          Batch verified authentic on National PharmaSafe Ledger. Cryptographic GS1 GTIN valid, intact supply-chain custody record, safe shelf-life window.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detailed Attributes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Batch Identifier</span>
                    <strong className="text-cyan-400 text-sm block truncate">{scanResult.batch_number || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Manufacturer</span>
                    <strong className="text-slate-200 block truncate">{scanResult.manufacturer_name || 'Pfizer Healthcare India'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Expiry Check</span>
                    <strong className={`block ${scanResult.is_expired ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                      {scanResult.is_expired ? '⚠️ EXPIRED' : '✓ VALID SHELF LIFE'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Dead Batch Registry</span>
                    <strong className={`block ${scanResult.is_dead_batch_reentry ? 'text-red-400 font-bold animate-pulse' : 'text-slate-400'}`}>
                      {scanResult.is_dead_batch_reentry ? '🚨 DESTROYED MATCH' : 'CLEARED (NO MATCH)'}
                    </strong>
                  </div>
                </div>

                {/* 21 CFR Part 11 Audit Trail Stamp */}
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Scan recorded in National Audit Log</span>
                  </div>
                  <span className="text-slate-500">{new Date(scanResult.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 space-y-3">
                <Search className="w-12 h-12 mx-auto text-slate-700" />
                <p className="text-xs">No scan performed yet. Position barcode in optical terminal or click a quick scenario.</p>
              </div>
            )}
          </div>

          {/* Action Links */}
          {scanResult && (
            <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 mt-6">
              <button
                onClick={() => navigate(`/batches/${scanResult.batch_number || 'B1001'}`)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-cyan-400 hover:text-white hover:border-cyan-500/60 flex items-center gap-1.5 transition-all"
              >
                <span>Inspect Digital Batch Passport</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/sales?batch=${scanResult.batch_number || 'B1001'}`)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  Proceed to Point-of-Sale Gate
                </button>
                {scanResult.verification_status !== 'AUTHENTIC' && (
                  <button
                    onClick={() => navigate(`/returns?batch=${scanResult.batch_number || 'B1001'}`)}
                    className="px-4 py-2 rounded-xl bg-rose-950/80 border border-rose-500/60 text-xs font-bold text-rose-300 hover:bg-rose-900 transition-colors"
                  >
                    Initiate Reverse Return
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyVerifyPage;
