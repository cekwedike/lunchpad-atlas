/**
 * Plays a short two-tone chime using the Web Audio API.
 * No audio file needed — synthesized entirely in the browser.
 * Safe to call from any client-side context; silently no-ops if
 * AudioContext is unavailable (SSR, unsupported browser).
 */
export function playNotificationTone(): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new AudioContext();

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    // Two-note chime: A5 (880 Hz) then C#6 (1108.73 Hz)
    const notes = [880, 1108.73];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + 0.5);
    });

    setTimeout(() => ctx.close(), 600);
  } catch {
    // Ignore — AudioContext blocked or unavailable
  }
}
