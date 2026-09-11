import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';

interface QrCodeViewProps {
  value: string;
  size?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  onOpenPassport?: () => void;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({
  value,
  size = 150,
  label,
  sublabel,
  className = '',
  onOpenPassport,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size * 2, // High resolution for mobile cameras
      margin: 1.5,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#030712', // crisp black
        light: '#FFFFFF', // pure white background
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate optical QR code:', err));
  }, [value, size]);

  return (
    <div className={`flex flex-col items-center p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg ${className}`}>
      {/* Real Optical Scannable QR Image */}
      <div className="p-2.5 bg-white rounded-lg shadow-md mb-2.5 flex items-center justify-center">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR Code: ${value}`}
            style={{ width: `${size}px`, height: `${size}px` }}
            className="block"
          />
        ) : (
          <div
            style={{ width: `${size}px`, height: `${size}px` }}
            className="flex items-center justify-center text-xs text-slate-400 font-mono"
          >
            Generating QR...
          </div>
        )}
      </div>

      {label && (
        <span className="text-xs font-mono font-bold text-cyan-300 tracking-wider mb-0.5">
          {label}
        </span>
      )}
      {sublabel && (
        <span className="text-[10px] text-slate-400 font-mono mb-2 text-center max-w-[200px] truncate">
          {sublabel}
        </span>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={handleCopy}
          className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md border border-slate-700 flex items-center gap-1 transition-all"
          title="Copy Batch ID or Payload"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy ID'}</span>
        </button>

        {onOpenPassport && (
          <button
            type="button"
            onClick={onOpenPassport}
            className="px-2.5 py-1 text-[11px] font-mono bg-cyan-950 hover:bg-cyan-900 text-cyan-300 hover:text-cyan-100 rounded-md border border-cyan-800/80 flex items-center gap-1 transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Passport</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default QrCodeView;
