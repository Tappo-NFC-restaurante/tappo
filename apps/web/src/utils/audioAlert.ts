/**
 * Utilitário de Alerta Sonoro usando Web Audio API nativo do navegador
 * Funciona offline sem depender de arquivos .mp3 externos!
 */

class SoundAlertService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Alerta de Chamado de Garçom: Dois toques suaves tipo sino de hotel
   */
  public playWaiterChime() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Primeiro tom (880Hz - Lá 5)
    this.playTone(ctx, 880, now, 0.4);
    // Segundo tom (1320Hz - Mi 6)
    this.playTone(ctx, 1320, now + 0.18, 0.5);
  }

  /**
   * Alerta de Novo Pedido da Cozinha: Arpeggio ascendente
   */
  public playOrderChime() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Dó 5 -> Mi 5 -> Sol 5
    this.playTone(ctx, 523.25, now, 0.25);
    this.playTone(ctx, 659.25, now + 0.12, 0.25);
    this.playTone(ctx, 783.99, now + 0.24, 0.45);
  }

  /**
   * Alerta de Pedido de Conta: Toque brilhante
   */
  public playBillChime() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.playTone(ctx, 987.77, now, 0.2);
    this.playTone(ctx, 1318.51, now + 0.15, 0.45);
  }

  private playTone(ctx: AudioContext, freq: number, startTime: number, duration: number) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Envelope suave de volume (evita estalo)
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      console.warn('Erro ao reproduzir alerta de áudio:', e);
    }
  }
}

export const soundAlert = new SoundAlertService();
export default soundAlert;
