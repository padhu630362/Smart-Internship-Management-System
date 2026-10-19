/**
 * SIMS Audio Synthesizer Utility
 * Generates clear, non-intrusive sound effects using standard Web Audio API oscillators.
 * Zero external audio assets required; immune to 404s, CORS, or missing file issues.
 */

class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.storageKey = 'sims_notification_sound';
  }

  isSoundEnabled() {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored === null ? true : stored !== 'false';
    } catch {
      return true;
    }
  }

  setSoundEnabled(enabled) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, enabled ? 'true' : 'false');
    } catch (err) {
      console.warn('Failed to persist sound preference:', err);
    }
  }

  getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Play a refined two-tone chime for real-time notifications and chat alerts
   */
  playNotificationChime() {
    if (!this.isSoundEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Note 2: B5 (987.77 Hz) - bright, elegant luxury chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.08);
      gain2.gain.setValueAtTime(0.1, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);
    } catch {
      // Audio playback restrictions (e.g. before initial user gesture) - gracefully ignore
    }
  }

  /**
   * Play a softer, subtle pop for quick message arrival in background
   */
  playMessagePop() {
    if (!this.isSoundEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Gracefully ignore
    }
  }
}

export const soundManager = new SoundManager();
export default soundManager;
