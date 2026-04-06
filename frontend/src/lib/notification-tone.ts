let sharedAudioContext: AudioContext | null = null;
let unlockListenersInstalled = false;

function getOrCreateAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext();
  }
  return sharedAudioContext;
}

/**
 * Resumes the shared AudioContext on first user gesture. Mobile browsers often
 * start the context suspended; without this, the in-app chime can stay silent
 * until the user has interacted with the page.
 */
export function installNotificationAudioUnlock(): void {
  if (typeof window === 'undefined' || unlockListenersInstalled) return;
  unlockListenersInstalled = true;

  const unlock = async () => {
    try {
      const ctx = getOrCreateAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
    } catch {
      /* ignore */
    }
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  };

  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
}

/**
 * Plays a short two-tone chime using the Web Audio API.
 * No audio file needed — synthesized entirely in the browser.
 * Safe to call from any client-side context; silently no-ops if
 * AudioContext is unavailable (SSR, unsupported browser).
 */
export function playNotificationTone(): void {
  void (async () => {
    if (typeof window === 'undefined') return;
    try {
      const ctx = getOrCreateAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

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
    } catch {
      // Ignore — AudioContext blocked or unavailable
    }
  })();
}
