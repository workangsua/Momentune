// Synchronous high-fidelity song highlight preview player for Momentune
let globalAudio: HTMLAudioElement | null = null;

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

// Play exact song climax audio preview 100% synchronously to prevent browser Autoplay blocks
export const playCardSongHighlight = (
  previewUrl: string | undefined,
  onEnd?: () => void
) => {
  stopAudioPreview();

  if (!previewUrl) {
    console.warn("No preview URL provided for playback");
    return;
  }

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
