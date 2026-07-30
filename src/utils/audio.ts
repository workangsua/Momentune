// High-fidelity song highlight preview player for Momentune
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

// Search iTunes API for the exact 30-second song climax preview
export const fetchSongClimaxPreview = async (artist: string, title: string): Promise<string | null> => {
  try {
    const query = `${title} ${artist}`.trim();
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
        return data.results[0].previewUrl;
      }
    }
  } catch (err) {
    console.warn("iTunes API preview fetch notice:", err);
  }
  return null;
};

// Play exact song climax audio preview
export const playCardSongHighlight = async (
  artist: string,
  title: string,
  existingPreviewUrl?: string,
  onEnd?: () => void
) => {
  initAudioContext();
  stopAudioPreview();

  // 1. Check if we already have a working preview URL, or fetch real climax preview from iTunes Search API
  let audioUrl = existingPreviewUrl;
  if (!audioUrl || audioUrl.includes("soundhelix")) {
    const fetchedUrl = await fetchSongClimaxPreview(artist, title);
    if (fetchedUrl) {
      audioUrl = fetchedUrl;
    }
  }

  if (!audioUrl) {
    console.warn("No real preview URL found for song:", title);
    return;
  }

  try {
    globalAudio = new Audio(audioUrl);
    globalAudio.volume = 0.75;

    const playPromise = globalAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Audio play notice:", err);
      });
    }

    globalAudio.onended = () => {
      if (onEnd) onEnd();
    };
  } catch (err) {
    console.warn("Audio creation error:", err);
  }
};

export const stopAudioPreview = () => {
  if (globalAudio) {
    globalAudio.pause();
    globalAudio.currentTime = 0;
    globalAudio = null;
  }
};
