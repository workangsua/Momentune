// Reliable audio highlight preview player for Momentune
let globalAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;

// Initialize Web Audio Context on user interaction (Safari requirement)
export const initAudioContext = () => {
  if (typeof window === "undefined") return;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
};

// Play soothing ambient chords using Web Audio API as 100% fail-safe for Safari / offline
export const playMelodicFallback = () => {
  initAudioContext();
  if (!audioCtx) return;

  try {
    const now = audioCtx.currentTime;
    // Ambient C Major 7th chord notes (C, E, G, B)
    const notes = [261.63, 329.63, 392.00, 493.88, 523.25];
    notes.forEach((freq, idx) => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.3);

      gain.gain.setValueAtTime(0.001, now + idx * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.3 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.3 + 3.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now + idx * 0.3);
      osc.stop(now + idx * 0.3 + 3.6);
    });
  } catch (e) {
    console.warn("Melodic fallback notice:", e);
  }
};

// Main function to play track preview audio
export const playAudioPreview = (
  previewUrl: string | undefined,
  onEnd?: () => void
) => {
  initAudioContext();

  // Stop previous global audio
  stopAudioPreview();

  // Working fallback MP3 link
  const mp3Url = previewUrl || "https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_700KB.mp3";

  try {
    globalAudio = new Audio();
    globalAudio.crossOrigin = "anonymous";
    globalAudio.src = mp3Url;
    globalAudio.volume = 0.7;

    const playPromise = globalAudio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Playing successfully
        })
        .catch((err) => {
          console.warn("MP3 playback notice (falling back to Web Audio synth):", err);
          playMelodicFallback();
        });
    }

    globalAudio.onended = () => {
      if (onEnd) onEnd();
    };
  } catch (err) {
    console.warn("Audio creation error, playing synth fallback:", err);
    playMelodicFallback();
  }
};

export const stopAudioPreview = () => {
  if (globalAudio) {
    globalAudio.pause();
    globalAudio.currentTime = 0;
    globalAudio = null;
  }
};
