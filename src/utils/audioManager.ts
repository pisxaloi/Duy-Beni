// Merkezi Ses Yöneticisi (Audio Manager)
// Tüm sesleri tek bir noktadan yönetir, sayfa değişiminde eski sesleri otomatik durdurur.

class AudioManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isStoppedRef: boolean = false;

  // Alarm sesi için ayrı referans (stopAll'dan etkilenmez)
  private alarmAudio: HTMLAudioElement | null = null;
  private alarmLoopInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Yeni bir HTMLAudio sesi oluşturur ve önceki tüm sesleri durdurur.
   * .play() çağrısı yapılmaz - çağıran taraf kontrol eder.
   */
  play(src: string, options?: { loop?: boolean; volume?: number }): HTMLAudioElement {
    this.stopAll();

    const audio = new Audio(src);
    audio.loop = options?.loop || false;
    if (options?.volume !== undefined) audio.volume = options.volume;

    this.currentAudio = audio;
    return audio;
  }

  /**
   * AudioContext üzerinden bir ses kaynağı çalar (decodeAudioData ile).
   * Önceki tüm sesleri durdurur.
   */
  playBufferSource(
    source: AudioBufferSourceNode,
    gainNode?: GainNode | null,
    destination?: AudioDestinationNode
  ): void {
    this.stopAll();
    this.currentSource = source;
    if (gainNode) {
      source.connect(gainNode);
    } else if (destination) {
      source.connect(destination);
    }
    source.start(0);
  }

  /**
   * AudioContext referansını kaydeder (dışarıdan set edilir).
   */
  setContext(ctx: AudioContext | null): void {
    this.currentContext = ctx;
  }

  /**
   * GainNode referansını kaydeder.
   */
  setGainNode(node: GainNode | null): void {
    this.gainNode = node;
  }

  /**
   * Tüm sesleri durdurur ve temizler.
   * Alarm sesine DOKUNMAZ (alarm ayrı yönetilir).
   */
  stopAll(): void {
    this.isStoppedRef = true;

    // HTMLAudioElement durdur (alarm hariç)
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {
        // ignore
      }
      this.currentAudio = null;
    }

    // AudioBufferSourceNode durdur
    if (this.currentSource) {
      try {
        if (this.currentSource.onended) {
          this.currentSource.onended = null;
        }
        this.currentSource.stop();
      } catch (e) {
        // ignore
      }
      this.currentSource = null;
    }

    // Konuşma sentezini durdur
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Eski currentLocalAudio referansını temizle
    if (typeof window !== 'undefined') {
      try {
        const win = window as any;
        if (win.currentLocalAudio) {
          win.currentLocalAudio.pause();
          win.currentLocalAudio.currentTime = 0;
          win.currentLocalAudio = null;
        }
      } catch (e) {
        // ignore
      }
    }

    this.isStoppedRef = false;
  }

  /**
   * Sayfa değiştiğinde çağrılır - tüm sesleri durdurur.
   */
  onPageChange(): void {
    this.stopAll();
  }

  /**
   * Tarayıcı autoplay politikasını aşmak için AudioContext tabanlı unlock.
   * Kullanıcı etkileşimi sonrası çağrılmalıdır.
   */
  async unlockAudio(): Promise<void> {
    try {
      // 1. Sessiz Audio dene
      const sessiz = new Audio();
      sessiz.volume = 0;
      await sessiz.play();
      return;
    } catch (e) {
      // sessiz Audio çalışmadı, AudioContext dene
    }

    try {
      // 2. AudioContext ile unlock
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.01);
    } catch (e) {
      console.warn("[AudioManager] unlockAudio failed:", e);
    }
  }

  /**
   * ALARM SESİ - Kullanıcı kapatana kadar döngüde çalar.
   * stopAll()'dan etkilenmez, sadece stopAlarm() ile durur.
   */
  playAlarm(src: string, volume: number = 1.0): void {
    // Önceki alarmı durdur
    this.stopAlarm();

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;

    // Ses bitse bile yeniden başlat (loop garantisi)
    const playLoop = () => {
      audio.play().catch((e) => {
        console.warn('[AudioManager] Alarm play failed, retrying in 1s:', e);
        setTimeout(playLoop, 1000);
      });
    };

    playLoop();

    // Periyodik olarak sesin hâlâ çaldığını kontrol et (her 5 saniyede bir)
    this.alarmLoopInterval = setInterval(() => {
      if (audio.paused && audio.currentTime > 0) {
        // Ses durduysa yeniden başlat
        audio.play().catch(() => {});
      }
    }, 5000);

    this.alarmAudio = audio;
  }

  /**
   * Alarm ses kaynağını değiştirir (çalıyorken bile).
   * Mevcut alarmı durdurup yeni kaynakla yeniden başlatır.
   */
  changeAlarmSource(newSrc: string, volume: number = 1.0): void {
    if (this.alarmAudio || this.alarmLoopInterval) {
      // Alarm çalıyorsa durdur ve yeni kaynakla başlat
      this.playAlarm(newSrc, volume);
    }
    // Alarm çalmıyorsa bir şey yapma
  }

  /**
   * Alarm sesini durdurur.
   */
  stopAlarm(): void {
    if (this.alarmLoopInterval) {
      clearInterval(this.alarmLoopInterval);
      this.alarmLoopInterval = null;
    }
    if (this.alarmAudio) {
      try {
        this.alarmAudio.pause();
        this.alarmAudio.currentTime = 0;
        this.alarmAudio.loop = false;
      } catch (e) {
        // ignore
      }
      this.alarmAudio = null;
    }
  }

  /**
   * Alarm çalıyor mu?
   */
  isAlarmPlaying(): boolean {
    return this.alarmAudio !== null && !this.alarmAudio.paused;
  }
}

export const audioManager = new AudioManager();
