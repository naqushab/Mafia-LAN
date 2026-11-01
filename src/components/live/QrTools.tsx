/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QR + clipboard plumbing for handshake codes. Everything runs locally:
 * codes are rendered with the `qrcode` package and decoded from the camera
 * feed with `jsqr`, so no third-party service ever sees a session.
 */

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { Camera, Check, Clipboard, ClipboardCheck, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Display                                                             */
/* ------------------------------------------------------------------ */

interface QrDisplayProps {
  value: string;
  size?: number;
  label?: string;
}

export const QrDisplay: React.FC<QrDisplayProps> = ({ value, size = 260, label }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setDataUrl(null);
      return;
    }
    QRCode.toDataURL(value, {
      margin: 1,
      width: size * 2,
      errorCorrectionLevel: 'L',
      color: { dark: '#0b0f1aff', light: '#f8fafcff' },
    })
      .then(url => {
        if (!cancelled) {
          setDataUrl(url);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not render QR');
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (error) {
    return (
      <div className="w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
        QR too large to render ({error}). Use the copy button instead.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-2xl bg-white p-2 shadow-xl shadow-black/50"
        style={{ width: size, height: size }}
      >
        {dataUrl ? (
          <img src={dataUrl} width={size - 16} height={size - 16} alt={label ?? 'Invite QR code'} />
        ) : (
          <div className="h-full w-full animate-pulse rounded-xl bg-slate-200" />
        )}
      </div>
      {label && <p className="text-[11px] text-slate-400 text-center max-w-[260px]">{label}</p>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

export const CopyButton: React.FC<{ value: string; label?: string; className?: string }> = ({
  value,
  label = 'Copy code',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 ${className}`}
    >
      {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Clipboard className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
};

export const ShareButton: React.FC<{ url: string; title: string; text: string }> = ({
  url,
  title,
  text,
}) => {
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* user dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-600/90 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-500"
    >
      <Check className="h-3.5 w-3.5" />
      Share invite
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* Camera scanner                                                      */
/* ------------------------------------------------------------------ */

interface QrScannerProps {
  onResult: (text: string) => void;
  onClose: () => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onResult, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onResultRef = useRef(onResult);
  const [error, setError] = useState<string | null>(null);

  // The parent re-renders on every network tick; holding the callback in a ref
  // keeps the camera stream alive instead of restarting it mid-scan.
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw && vh) {
          // Decode at a reduced size: 1080p frame-by-frame QR detection is slow
          // enough to miss the code on a phone.
          const scale = Math.min(1, 640 / Math.max(vw, vh));
          const w = Math.round(vw * scale);
          const h = Math.round(vh * scale);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const image = ctx.getImageData(0, 0, w, h);
            const code = jsQR(image.data, w, h, { inversionAttempts: 'dontInvert' });
            if (code?.data) {
              stopped = true;
              onResultRef.current(code.data);
              return;
            }
          }
        }
      }
      if (!stopped) raf = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        raf = requestAnimationFrame(tick);
      } catch (err) {
        setError(
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera permission denied. Paste the code instead.'
            : 'No camera available. Paste the code instead.'
        );
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-black">
      <video ref={videoRef} playsInline muted className="h-64 w-full object-cover opacity-90" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-40 w-40 rounded-2xl border-2 border-rose-400/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 rounded-lg bg-black/70 p-1.5 text-slate-300 hover:text-white"
        aria-label="Close scanner"
      >
        <X className="h-4 w-4" />
      </button>
      {error && (
        <p className="absolute inset-x-0 bottom-0 bg-black/80 p-2 text-center text-[11px] text-amber-300">
          {error}
        </p>
      )}
    </div>
  );
};

export const CameraButton: React.FC<{ label?: string; onClick: () => void }> = ({
  label = 'Scan QR',
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
  >
    <Camera className="h-3.5 w-3.5" />
    {label}
  </button>
);
