import { MusicCard } from '../types';
import { fetchSongPreviewUrl } from './audio';

// Curated local fallback database of track recommendations mapped to tags
export interface FallbackTrack {
  title: string;
  artist: string;
  albumCover: string;
  spotifyUrl: string;
  genre: string;
}

export const FALLBACK_TRACKS: FallbackTrack[] = [
  // Movement: Morning Commute / Activity: Work/Study
  {
    title: "Coffee & Wind",
    artist: "Lofi Breeze",
    albumCover: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/0VjIjW4GlmCkg5v9dJmIeB",
    genre: "lofi"
  },
  {
    title: "Morning Sun",
    artist: "Acoustic Dreams",
    albumCover: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/5S5f7V5G8GsnmD0BqP56mS",
    genre: "acoustic"
  },
  // Movement: Walking / Weather: Sunny / Mood: Happy/Energetic
  {
    title: "Walking on Sunshine",
    artist: "Katrina and the Waves",
    albumCover: "https://images.unsplash.com/photo-1526218626217-dc65a29bb444?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/05wIrZR468iLsz29FGu76X",
    genre: "pop"
  },
  {
    title: "Good Vibrations",
    artist: "The Beach Boys",
    albumCover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/5tXgbbqy1442y3t4V146Xb",
    genre: "classic rock"
  },
  // Activity: Workout / Mood: Energetic
  {
    title: "Pump It Up",
    artist: "Dance Club Legends",
    albumCover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/5n69Tz5mS5a6Pj8K723145",
    genre: "dance"
  },
  {
    title: "Neon Horizon",
    artist: "Synth Runner",
    albumCover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/10V4S0G91k4j6Fz6b32810",
    genre: "synthwave"
  },
  // Weather: Rain / Mood: Sentimental/Gloomy
  {
    title: "Rainy Afternoon",
    artist: "Piano Melancholia",
    albumCover: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/30V4S0G91k4j6Fz6b32830",
    genre: "classical"
  },
  {
    title: "Lost in the Rain",
    artist: "Blue Moods",
    albumCover: "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/40V4S0G91k4j6Fz6b32840",
    genre: "jazz"
  },
  // Activity: Rest / Mood: Calm/Dreamy
  {
    title: "Weightless Space",
    artist: "Ambient Voyager",
    albumCover: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/50V4S0G91k4j6Fz6b32850",
    genre: "ambient"
  },
  {
    title: "Sunset Drift",
    artist: "Chilled Waves",
    albumCover: "https://images.unsplash.com/photo-1518235506717-e1edb106f89b?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/60V4S0G91k4j6Fz6b32860",
    genre: "chillout"
  },
  // Movement: Travel/Drive
  {
    title: "Midnight Drive",
    artist: "Retro Cruise",
    albumCover: "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/70V4S0G91k4j6Fz6b32870",
    genre: "rock"
  },
  {
    title: "Fly Away",
    artist: "Indie Coastal",
    albumCover: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&q=80",
    spotifyUrl: "https://open.spotify.com/track/80V4S0G91k4j6Fz6b32880",
    genre: "indie"
  }
];

// PKCE helper functions
const generateRandomString = (length: number): string => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
};

const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

// Initiate Spotify PKCE OAuth
export const redirectToSpotifyAuth = async (clientId: string) => {
  if (!clientId) {
    alert("Please configure Spotify Client ID in Settings first.");
    return;
  }

  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  if (typeof window !== 'undefined') {
    localStorage.setItem('spotify_code_verifier', codeVerifier);
  }

  const redirectUri = `${window.location.origin}/`;
  const scope = 'user-library-read playlist-read-private user-top-read';

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  }).toString();

  window.location.href = authUrl.toString();
};

// Retrieve tokens using authorization code
export const fetchSpotifyTokens = async (clientId: string, code: string): Promise<{ token: string; refreshToken: string; user: string } | null> => {
  const codeVerifier = localStorage.getItem('spotify_code_verifier') || '';
  const redirectUri = `${window.location.origin}/`;

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    localStorage.removeItem('spotify_code_verifier');

    // Fetch user profile name
    const userProfileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    
    let displayName = 'Spotify User';
    if (userProfileResponse.ok) {
      const userProfile = await userProfileResponse.json();
      displayName = userProfile.display_name || userProfile.id;
    }

    return {
      token: data.access_token,
      refreshToken: data.refresh_token,
      user: displayName
    };
  } catch (error) {
    console.error('Error fetching Spotify tokens:', error);
    return null;
  }
};

// Refresh expired token
export const refreshSpotifyToken = async (clientId: string, refreshToken: string): Promise<string | null> => {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    return null;
  }
};

// Helper: Query Spotify API with auth header
const querySpotifyApi = async (url: string, token: string, method = 'GET'): Promise<any> => {
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (response.status === 401) {
    // Indicates token expired, needs to be handled by caller
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// Fetch track recommendations based on user tags
export const getRandomTrack = async (
  context: { movement: string; activity: string; weather: string; mood: string },
  token: string | null
): Promise<MusicCard['track']> => {
  // Combine tags for mapping
  const tags = [context.movement, context.activity, context.weather, context.mood].filter(Boolean);
  
  // Decide if we use logged in Spotify connection or Fallback/Search API
  if (token) {
    try {
      // 1. Try to fetch from user's saved tracks (Library mode)
      // Let's get user's top tracks or saved tracks to draw randomly
      const savedTracksData = await querySpotifyApi('https://api.spotify.com/v1/me/tracks?limit=30', token);
      
      if (savedTracksData && savedTracksData.items && savedTracksData.items.length > 0) {
        // Draw a random item
        const randIndex = Math.floor(Math.random() * savedTracksData.items.length);
        const item = savedTracksData.items[randIndex].track;
        const artistName = item.artists.map((a: any) => a.name).join(', ');
        const previewUrl = item.preview_url || (await fetchSongPreviewUrl(artistName, item.name));
        return {
          title: item.name,
          artist: artistName,
          albumCover: item.album.images[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
          spotifyUrl: item.external_urls.spotify,
          previewUrl: previewUrl,
          id: item.id
        };
      }
      
      // 2. If library is empty, fetch via Recommendations API using seed genres matching mood/activity
      const genreSeed = mapTagsToGenre(context.mood, context.activity);
      const recData = await querySpotifyApi(`https://api.spotify.com/v1/recommendations?limit=10&seed_genres=${genreSeed}`, token);
      
      if (recData && recData.tracks && recData.tracks.length > 0) {
        const randIndex = Math.floor(Math.random() * recData.tracks.length);
        const track = recData.tracks[randIndex];
        const artistName = track.artists.map((a: any) => a.name).join(', ');
        const previewUrl = track.preview_url || (await fetchSongPreviewUrl(artistName, track.name));
        return {
          title: track.name,
          artist: artistName,
          albumCover: track.album.images[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
          spotifyUrl: track.external_urls.spotify,
          previewUrl: previewUrl,
          id: track.id
        };
      }
    } catch (err: any) {
      console.warn("Spotify logged-in request failed, falling back to open search or local catalog...", err);
    }
  }

  // Fallback / Open Recommendation logic: Draw from local curated fallback tracks matching the vibe
  const selectedGenre = mapTagsToGenre(context.mood, context.activity);
  const matchingTracks = FALLBACK_TRACKS.filter(t => t.genre === selectedGenre || selectedGenre.includes(t.genre));
  const pool = matchingTracks.length > 0 ? matchingTracks : FALLBACK_TRACKS;
  
  const randTrack = pool[Math.floor(Math.random() * pool.length)];
  const realPreviewUrl = await fetchSongPreviewUrl(randTrack.artist, randTrack.title);
  return {
    title: randTrack.title,
    artist: randTrack.artist,
    albumCover: randTrack.albumCover,
    spotifyUrl: randTrack.spotifyUrl,
    previewUrl: realPreviewUrl
  };
};

// Maps mood and activity to Spotify seed genres
const mapTagsToGenre = (mood: string, activity: string): string => {
  const m = mood.toLowerCase();
  const act = activity.toLowerCase();

  // Mood checks
  if (m.includes('신남') || m.includes('happy') || m.includes('energy')) return 'pop';
  if (m.includes('차분') || m.includes('calm') || m.includes('relax')) return 'acoustic';
  if (m.includes('몽환') || m.includes('dreamy')) return 'ambient';
  if (m.includes('우울') || m.includes('sentimental') || m.includes('gloomy')) return 'jazz';
  if (m.includes('피곤') || m.includes('tired')) return 'chill';

  // Activity checks
  if (act.includes('운동') || act.includes('workout')) return 'dance';
  if (act.includes('작업') || act.includes('work') || act.includes('공부')) return 'lofi';
  if (act.includes('휴식') || act.includes('rest')) return 'chill';
  if (act.includes('멍때리기')) return 'ambient';

  // Default seed
  return 'indie';
};
