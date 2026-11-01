import { useEffect, useRef } from 'react';

/** Quiet, identical feedback for every player so it does not reveal a role or vote. */
export function useInteractionFeedback(sounds: boolean, haptics: boolean) {
  const audio = useRef<AudioContext | null>(null);
  const preferences = useRef({sounds,haptics});
  preferences.current = {sounds,haptics};

  useEffect(() => {
    function feedback(target: Element) {
      const soundToggle = target.closest('[aria-label="Enable game sounds"]');
      const checkbox = target instanceof window.HTMLInputElement ? target : null;
      // Let turning a setting on give immediate feedback too.
      const soundEnabled = preferences.current.sounds || !!soundToggle || !!(checkbox?.getAttribute('aria-label') === 'Button sounds' && checkbox.checked);
      const vibrationEnabled = preferences.current.haptics || !!(checkbox?.getAttribute('aria-label') === 'Button vibration' && checkbox.checked);
      if (vibrationEnabled) {
        try { window.navigator.vibrate?.(8); } catch { /* Unsupported or blocked by the device. */ }
      }
      if (!soundEnabled) return;
      const fallback = () => {
        try {
          if (!preferences.current.sounds && !soundToggle && !(checkbox?.getAttribute('aria-label') === 'Button sounds' && checkbox.checked)) return;
          const player = new window.Audio('./werewolf/audio/tap.wav');
          player.volume = 0.5;
          void player.play()?.catch(()=>{});
        } catch { /* The phone may block audio or be muted. */ }
      };
      try {
        const AudioClass = window.AudioContext || (window as typeof window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
        if (!AudioClass) { fallback(); return; }
        const context = audio.current || (audio.current = new AudioClass());
        const playTap = () => {
          if (!preferences.current.sounds && !soundToggle && !(checkbox?.getAttribute('aria-label') === 'Button sounds' && checkbox.checked)) return;
          try {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const now = context.currentTime;
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(620,now);
            oscillator.frequency.exponentialRampToValueAtTime(430,now+0.045);
            gain.gain.setValueAtTime(0.0001,now);
            gain.gain.exponentialRampToValueAtTime(0.14,now+0.004);
            gain.gain.exponentialRampToValueAtTime(0.0001,now+0.075);
            oscillator.connect(gain); gain.connect(context.destination);
            oscillator.start(now); oscillator.stop(now+0.08);
            oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
          } catch { fallback(); }
        };
        if (context.state !== 'running') void context.resume().then(playTap).catch(fallback);
        else playTap();
      } catch { fallback(); /* Audio must never stop gameplay. */ }
    }
    function valid(target: EventTarget | null): Element | null {
      if (!(target instanceof window.Element) || !target.closest('main.app')) return null;
      const control=target.closest('button, input, select, summary, [role="button"]');
      if (!control || control.matches(':disabled') || control.closest('fieldset:disabled') || control.getAttribute('aria-disabled') === 'true') return null;
      return control;
    }
    function click(event: MouseEvent) {
      const control=valid(event.target);
      if (!control || control.classList.contains('hold-button')) return;
      // A label forwards its click to its input. Only play for the input, once.
      if (control.tagName === 'LABEL') return;
      if (control instanceof window.HTMLInputElement && !['checkbox','radio','file','button','submit'].includes(control.type)) return;
      if (control.tagName === 'SELECT') return;
      feedback(control);
    }
    function change(event: Event) {
      const control=valid(event.target);
      if (control instanceof window.HTMLSelectElement || (control instanceof window.HTMLInputElement && ['range','number'].includes(control.type))) feedback(control);
    }
    function pointerdown(event: PointerEvent) {
      const control=valid(event.target);
      if (control?.classList.contains('hold-button') && event.button===0) feedback(control);
    }
    function keydown(event: KeyboardEvent) {
      const control=valid(event.target);
      if (control?.classList.contains('hold-button') && (event.key==='Enter' || event.key===' ') && !event.repeat) feedback(control);
    }
    document.addEventListener('click',click,true);
    document.addEventListener('change',change,true);
    document.addEventListener('pointerdown',pointerdown,true);
    document.addEventListener('keydown',keydown,true);
    return () => {
      document.removeEventListener('click',click,true);
      document.removeEventListener('change',change,true);
      document.removeEventListener('pointerdown',pointerdown,true);
      document.removeEventListener('keydown',keydown,true);
      const context=audio.current; audio.current=null;
      if (context && typeof context.close === 'function') void context.close().catch(()=>{});
    };
  }, []);
}
