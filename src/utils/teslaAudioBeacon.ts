/**
 * Tesla Audio Keep-Alive Beacon
 * Reverse-engineered from CyberDash's iptvCabinAudioBeacon & speedoCabinBeacon architecture.
 *
 * In Tesla's Chromium infotainment browser, tab rendering and video pipelines are throttled
 * or suspended by the OS when shifting gears or navigating apps unless an unmuted audio
 * device is actively streaming. This beacon maintains a silent, unthrottled audio channel.
 */

// 1-second silent WAV audio data URI
const SILENT_WAV_BASE64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w==';

class TeslaAudioBeaconManager {
  private beaconElement: HTMLAudioElement | null = null;
  private isActive = false;
  private autoResumeListener: (() => void) | null = null;

  public start(beaconId = 'bssCabinAudioBeacon'): boolean {
    if (typeof document === 'undefined' || this.isActive) return false;

    try {
      let el = document.getElementById(beaconId) as HTMLAudioElement | null;
      if (!el) {
        el = document.createElement('audio');
        el.id = beaconId;
        el.src = SILENT_WAV_BASE64;
        el.loop = true;
        el.preload = 'auto';
        el.volume = 0.01; // Barely audible / virtual silence to prevent hardware suspension
        el.tabIndex = -1;
        el.setAttribute('playsinline', '');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.001;pointer-events:none;z-index:-9999;bottom:0;right:0;';
        document.body.appendChild(el);
      }

      // CyberDash auto-resume handler: If the vehicle OS or browser pauses audio, immediately resume
      this.autoResumeListener = () => {
        if (this.isActive && el && (el.paused || el.ended)) {
          el.play().catch(() => {});
        }
      };

      el.addEventListener('pause', this.autoResumeListener);
      el.play().catch(() => {
        // User interaction might be required on initial tap
      });

      this.beaconElement = el;
      this.isActive = true;
      return true;
    } catch {
      return false;
    }
  }

  public stop() {
    this.isActive = false;
    if (this.beaconElement) {
      if (this.autoResumeListener) {
        this.beaconElement.removeEventListener('pause', this.autoResumeListener);
        this.autoResumeListener = null;
      }
      try {
        this.beaconElement.pause();
        this.beaconElement.remove();
      } catch {}
      this.beaconElement = null;
    }
  }

  public isRunning(): boolean {
    return this.isActive;
  }
}

export const teslaAudioBeacon = new TeslaAudioBeaconManager();
