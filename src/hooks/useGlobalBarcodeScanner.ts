'use client';

import { useEffect, useRef } from 'react';

interface UseGlobalBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  maxIntervalMs?: number;
  minLength?: number;
}

/**
 * Hook para capturar disparos de pistolas lectoras de código de barras USB/Bluetooth
 * en cualquier parte de la pantalla de forma global.
 */
export function useGlobalBarcodeScanner({
  onScan,
  enabled = true,
  maxIntervalMs = 50,
  minLength = 3,
}: UseGlobalBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar teclas modificadoras
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      const diff = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Si es Enter
      if (e.key === 'Enter') {
        const scanned = bufferRef.current.trim();
        bufferRef.current = '';

        if (scanned.length >= minLength) {
          // Si el buffer se acumuló a velocidad de escáner (< 70ms promedio)
          e.preventDefault();
          e.stopPropagation();
          playScannerBeep(true);
          onScanRef.current(scanned);
        }
        return;
      }

      // Solo procesar caracteres imprimibles
      if (e.key.length === 1) {
        // Si el tiempo entre teclas fue muy largo, resetear buffer (escritura humana manual)
        if (diff > maxIntervalMs) {
          bufferRef.current = e.key;
        } else {
          // Secuencia rápida de escáner
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, maxIntervalMs, minLength]);
}

/**
 * Sonido sintético de feedback acústico para el escáner (sin archivos de audio externos)
 */
export function playScannerBeep(success: boolean = true) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(success ? 1046.5 : 220, ctx.currentTime); // C6 nota alta agradable
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // Si el navegador bloquea audio antes de interacción, se ignora silenciosamente
  }
}
