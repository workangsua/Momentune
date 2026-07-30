import { MusicCard } from '../types';
import { fetchSongPreviewUrl } from './audio';

// Curated local fallback database of famous real tracks matching user favorite playlists
export interface FallbackTrack {
  title: string;
  artist: string;
  albumCover: string;
  spotifyUrl: string;
  genre: string;
}

export const FALLBACK_TRACKS: FallbackTrack[] = [
  {
    title: "115 million kilometer film",
    artist: "OFFICIAL HIGE DANDISM",
    albumCover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/10V4S0G91k4j6Fz6b32810",
    genre: "pop"
  },
  {
    title: "Pretender",
    artist: "OFFICIAL HIGE DANDISM",
    albumCover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/5V4S0G91k4j6Fz6b32811",
    genre: "pop"
  },
  {
    title: "Ditto",
    artist: "NewJeans",
    albumCover: "https://images.unsplash.com/photo-1526218626217-dc65a29bb444?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/30V4S0G91k4j6Fz6b32812",
    genre: "kpop"
  },
  {
    title: "Through the Night (밤편지)",
    artist: "IU",
    albumCover: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/40V4S0G91k4j6Fz6b32813",
    genre: "ballad"
  },
  {
    title: "Viva La Vida",
    artist: "Coldplay",
    albumCover: "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/50V4S0G91k4j6Fz6b32814",
    genre: "rock"
  },
  {
    title: "Spring Day (봄날)",
    artist: "BTS",
    albumCover: "https://images.unsplash.com/photo-1518235506717-e1edb106f89b?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/60V4S0G91k4j6Fz6b32815",
    genre: "kpop"
  },
  {
    title: "Cruel Summer",
    artist: "Taylor Swift",
    albumCover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/70V4S0G91k4j6Fz6b32816",
    genre: "pop"
  },
  {
    title: "Walking on Sunshine",
    artist: "Katrina and the Waves",
    albumCover: "https://images.unsplash.com/photo-1526218626217-dc65a29bb444?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/05wIrZR468iLsz29FGu76X",
    genre: "pop"
  },
  {
    title: "You Were Beautiful (예뻤어)",
    artist: "DAY6",
    albumCover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/80V4S0G91k4j6Fz6b32817",
    genre: "band"
  }
];

// Spotify Authentication Redirect
export const redirectToSpotifyAuth = (clientId: string) => {
  if (!clientId || typeof window === "undefined") return;
  const redirectUri = window.location.origin + "/";
  const scopes = [
    "user-read-private",
    "user-read-email",
    "user-library-read",
    "playlist-read-private",
    "playlist-read-collaborative"
  ].join(" ");

  localStorage.setItem("momentune_spotify_client_id", clientId);

  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${encodeURIComponent(
    clientId
  )}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&show_dialog=true`;

  window.location.href = authUrl;
};

// Spotify Token Exchange Callback
export const fetchSpotifyTokens = async (
  clientId: string,
  code: string
): Promise<{ token: string; refreshToken: string; user: string } | null> => {
  try {
    const redirectUri = window.location.origin + "/";
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return null;
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Fetch user profile name
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let userName = "Spotify User";
    if (profileRes.ok) {
      const profile = await profileRes.json();
      userName = profile.display_name || profile.id || "Spotify User";
    }

    return {
      token: accessToken,
      refreshToken: refreshToken,
      user: userName,
    };
  } catch (err) {
    console.error("fetchSpotifyTokens error:", err);
    return null;
  }
};

// Helper to query Spotify Web API
export const querySpotifyApi = async (url: string, token: string) => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED_SPOTIFY_TOKEN");
    }
    throw new Error(`Spotify API error: ${response.statusText}`);
  }

  return response.json();
};

// Fetch track recommendations strictly from user's registered playlists & library
export const getRandomTrack = async (
  context: { movement: string; activity: string; weather: string; mood: string },
  token: string | null
): Promise<MusicCard['track']> => {
  if (token) {
    try {
      const userTracks: any[] = [];

      // 1. Fetch User's Liked/Saved Tracks (/v1/me/tracks)
      const savedData = await querySpotifyApi('https://api.spotify.com/v1/me/tracks?limit=50', token);
      if (savedData?.items) {
        savedData.items.forEach((item: any) => {
          if (item.track) userTracks.push(item.track);
        });
      }

      // 2. Fetch User's Playlists (/v1/me/playlists) & playlist tracks
      const playlistsData = await querySpotifyApi('https://api.spotify.com/v1/me/playlists?limit=20', token);
      if (playlistsData?.items && playlistsData.items.length > 0) {
        const targetPlaylists = playlistsData.items.slice(0, 5);
        for (const pl of targetPlaylists) {
          if (pl?.id) {
            try {
              const plTracksData = await querySpotifyApi(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=50`, token);
              if (plTracksData?.items) {
                plTracksData.items.forEach((item: any) => {
                  if (item.track && item.track.id) {
                    userTracks.push(item.track);
                  }
                });
              }
            } catch (e) {
              console.warn(`Playlist ${pl.id} track fetch warning:`, e);
            }
          }
        }
      }

      // Deduplicate user tracks by Spotify ID
      const uniqueUserTracksMap = new Map();
      userTracks.forEach((t) => {
        if (t && t.id && t.name && t.artists) {
          uniqueUserTracksMap.set(t.id, t);
        }
      });
      const uniqueUserTracks = Array.from(uniqueUserTracksMap.values());

      if (uniqueUserTracks.length > 0) {
        // Pick a random track strictly from user's registered playlists/library!
        const randTrack: any = uniqueUserTracks[Math.floor(Math.random() * uniqueUserTracks.length)];
        const artistName = randTrack.artists.map((a: any) => a.name).join(', ');
        const previewUrl = randTrack.preview_url || (await fetchSongPreviewUrl(artistName, randTrack.name));

        return {
          title: randTrack.name,
          artist: artistName,
          albumCover: randTrack.album?.images[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
          spotifyUrl: randTrack.external_urls?.spotify || `https://open.spotify.com/track/${randTrack.id}`,
          previewUrl: previewUrl,
          id: randTrack.id
        };
      }
    } catch (err: any) {
      console.warn("Spotify library/playlist request error, using fallback catalog...", err);
    }
  }

  // Fallback: Select from famous user-favorite playlist catalog
  const randTrack = FALLBACK_TRACKS[Math.floor(Math.random() * FALLBACK_TRACKS.length)];
  const realPreviewUrl = await fetchSongPreviewUrl(randTrack.artist, randTrack.title);
  return {
    title: randTrack.title,
    artist: randTrack.artist,
    albumCover: randTrack.albumCover,
    spotifyUrl: randTrack.spotifyUrl,
    previewUrl: realPreviewUrl
  };
};

// Maps mood and activity to Spotify seed genres (helper function)
export const mapTagsToGenre = (mood: string, activity: string): string => {
  const m = mood.toLowerCase();
  const act = activity.toLowerCase();

  if (act.includes('운동')) return 'dance';
  if (act.includes('휴식') || m.includes('차분')) return 'chill';
  if (m.includes('신남') || m.includes('에너지')) return 'pop';
  if (m.includes('우울') || m.includes('센치')) return 'ballad';
  return 'pop';
};
