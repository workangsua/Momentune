// Synchronous high-fidelity song highlight preview player for Momentune
let globalAudio: HTMLAudioElement | null = null;
let currentPlaySessionId = 0; // Increment on every stop/change to invalidate pending async fetches!

// Search iTunes API for the exact 30-second song climax preview URL
export const fetchSongPreviewUrl = async (artist: string, title: string): Promise<string | undefined> => {
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
    console.warn("iTunes preview fetch error:", err);
  }
  return undefined;
};

export const getCurrentPlaySessionId = (): number => currentPlaySessionId;

// Play exact song climax audio preview 100% synchronously to prevent browser Autoplay blocks
export const playCardSongHighlight = (
  previewUrl: string | undefined,
  onEnd?: () => void,
  targetSessionId?: number
) => {
  // If targetSessionId was provided and does not match current session, abort playback!
  if (targetSessionId !== undefined && targetSessionId !== currentPlaySessionId) {
    return;
  }

  // Stop any currently playing audio and invalidate previous sessions
  stopAudioPreview();

  if (!previewUrl) {
    console.warn("No preview URL provided for playback");
    return;
  }

  // Record active session ID for this playback
  const session = ++currentPlaySessionId;

  try {
    globalAudio = new Audio(previewUrl);
    globalAudio.volume = 0.85;

    const playPromise = globalAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Audio play prevented by browser:", err);
      });
    }

    globalAudio.onended = () => {
      if (onEnd && session === currentPlaySessionId) onEnd();
    };
  } catch (err) {
    console.warn("Audio creation error:", err);
  }
};

export const stopAudioPreview = () => {
  currentPlaySessionId++; // Invalidate any pending async preview requests!
  if (globalAudio) {
    try {
      globalAudio.pause();
      globalAudio.currentTime = 0;
    } catch (e) {
      // Ignore pause error if audio is unloading
    }
    globalAudio = null;
  }
};
