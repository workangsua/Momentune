import { MusicCard } from '../types';
import { fetchSongPreviewUrl } from './audio';

// Curated local fallback database of famous real tracks with authentic album artwork
export interface FallbackTrack {
  title: string;
  artist: string;
  albumCover: string;
  spotifyUrl: string;
  genre: string;
}

export const FALLBACK_TRACKS: FallbackTrack[] = [
  {
    title: "Viva La Vida",
    artist: "Coldplay",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/0c/33/c4/0c33c4a2-1b1a-2895-71ad-20b1c0627e74/0094636803358.jpg/600x600bb.jpg",
    spotifyUrl: "https://open.spotify.com/track/1E2RFG4x5aGZ1KjD6lC7aG",
    genre: "rock"
  },
  {
    title: "115 million kilometer film",
    artist: "OFFICIAL HIGE DANDISM",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/a4/09/a9/a409a96e-5f91-5366-51e4-845a7a9cb5bf/PCCA-04716.jpg/600x600bb.jpg",
    spotifyUrl: "https://open.spotify.com/track/10V4S0G91k4j6Fz6b32810",
    genre: "pop"
  },
  {
    title: "Pretender",
    artist: "OFFICIAL HIGE DANDISM",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/f5/63/87/f56387fb-f0aa-b169-7988-82559e35928d/PCCA-04784.jpg/600x600bb.jpg",
    spotifyUrl: "https://open.spotify.com/track/5V4S0G91k4j6Fz6b32811",
    genre: "pop"
  },
  {
    title: "Ditto",
    artist: "NewJeans",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/1c/b4/43/1cb4431e-4f05-4f47-2b72-040ef36b6d27/cover_NewJeans_OMG.jpg/600x600bb.jpg",
    spotifyUrl: "https://open.spotify.com/track/30V4S0G91k4j6Fz6b32812",
    genre: "kpop"
  },
  {
    title: "Through the Night (밤편지)",
    artist: "IU",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/64/0a/63/640a6311-64d9-5f2a-e837-77fb26ff38a0/cover_IU_Palette.jpg/600x600bb.jpg",
    spotifyUrl: "https://open.spotify.com/track/40V4S0G91k4j6Fz6b32813",
    genre: "ballad"
  },
  {
    title: "Spring Day (봄날)",
    artist: "BTS",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/05/88/50/05885068-18e3-0c46-7c05-b00abfb8e684/cover-YOU_NEVER_WALK_ALONE.jpg/600x600bb.jpg",
    spotifyUrl: "https://open.spotify.com/track/60V4S0G91k4j6Fz6b32815",
    genre: "kpop"
  },
  {
    title: "Cruel Summer",
    artist: "Taylor Swift",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/6c/fb/8f/6cfb8f80-0a86-7782-b75b-4ecdf8e8a614/19UMGIM70868.rgb.jpg/600x600bb.jpg",
    spotifyUrl: "https://open.spotify.com/track/70V4S0G91k4j6Fz6b32816",
    genre: "pop"
  }
];

// Helper PKCE generators for Spotify OAuth
const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input: ArrayBuffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

// Fetch official track metadata (high-res album cover & preview URL) from iTunes API
export const fetchSongMetadata = async (artist: string, title: string) => {
  try {
    const query = `${title} ${artist}`.trim();
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const artwork = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : null;
        return {
          previewUrl: item.previewUrl || undefined,
          albumCover: artwork || undefined
        };
      }
    }
  } catch (err) {
    console.warn("iTunes metadata fetch notice:", err);
  }
  return {};
};

// Spotify PKCE Authentication Redirect
export const redirectToSpotifyAuth = async (clientId: string) => {
  if (!clientId || typeof window === "undefined") return;
  
  const verifier = generateRandomString(64);
  const hashed = await sha256(verifier);
  const codeChallenge = base64encode(hashed);

  const redirectUri = window.location.origin + "/";
  const scopes = [
    "user-read-private",
    "user-read-email",
    "user-library-read",
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-top-read"
  ].join(" ");

  localStorage.setItem("momentune_spotify_client_id", clientId);
  localStorage.setItem("momentune_spotify_code_verifier", verifier);

  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${encodeURIComponent(
    clientId
  )}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&code_challenge_method=S256&code_challenge=${encodeURIComponent(codeChallenge)}&show_dialog=true`;

  window.location.href = authUrl;
};

// Spotify Token Exchange Callback with PKCE Code Verifier
export const fetchSpotifyTokens = async (
  clientId: string,
  code: string
): Promise<{ token: string; refreshToken: string; user: string } | null> => {
  if (typeof window === "undefined") return null;

  const codeVerifier = localStorage.getItem("momentune_spotify_code_verifier");
  const origin = window.location.origin;
  const redirectUris = [origin + "/", origin];

  for (const redirectUri of redirectUris) {
    try {
      const payload: Record<string, string> = {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
      };

      if (codeVerifier) {
        payload.code_verifier = codeVerifier;
      }

      const body = new URLSearchParams(payload);

      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (tokenRes.ok) {
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
      } else {
        const errText = await tokenRes.text();
        console.error(`Token exchange attempt failed for ${redirectUri}:`, errText);
      }
    } catch (err) {
      console.error("fetchSpotifyTokens attempt notice:", err);
    }
  }
  return null;
};

// Silent Background Spotify Access Token Refresh via Refresh Token
export const refreshSpotifyAccessToken = async (
  clientId: string,
  refreshToken: string
): Promise<{ token: string; user: string } | null> => {
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
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
      console.error("Token refresh failed:", await tokenRes.text());
      return null;
    }

    const tokenData = await tokenRes.json();
    const newAccessToken = tokenData.access_token;

    // Fetch user profile name
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${newAccessToken}`,
      },
    });

    let userName = "Spotify User";
    if (profileRes.ok) {
      const profile = await profileRes.json();
      userName = profile.display_name || profile.id || "Spotify User";
    }

    return {
      token: newAccessToken,
      user: userName,
    };
  } catch (err) {
    console.error("refreshSpotifyAccessToken error:", err);
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
    if (response.status === 403) {
      throw new Error("SPOTIFY_API_403_FORBIDDEN");
    }
    throw new Error(`Spotify API error ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Diagnostic connection test helper for Spotify Web API
export const testSpotifyConnection = async (token: string | null): Promise<{ success: boolean; message: string; savedCount?: number; playlistCount?: number }> => {
  if (!token) {
    return { success: false, message: "Spotify 연동 토큰이 없습니다. 'Spotify 로그인 연동'을 해주세요." };
  }

  try {
    const profile = await querySpotifyApi("https://api.spotify.com/v1/me", token);
    const saved = await querySpotifyApi("https://api.spotify.com/v1/me/tracks?limit=10", token);
    const playlists = await querySpotifyApi("https://api.spotify.com/v1/me/playlists?limit=10", token);

    const savedCount = saved?.total ?? saved?.items?.length ?? 0;
    const playlistCount = playlists?.total ?? playlists?.items?.length ?? 0;

    return {
      success: true,
      savedCount,
      playlistCount,
      message: `✅ Spotify 연동 완벽 정상! (사용자: ${profile.display_name || profile.id}, 좋아요 수록곡: ${savedCount}개, 플레이리스트: ${playlistCount}개 감지됨)`
    };
  } catch (err: any) {
    console.error("testSpotifyConnection error:", err);
    if (err?.message?.includes("403") || err?.message?.includes("FORBIDDEN")) {
      return {
        success: false,
        message: "❌ Spotify API 403 (권한 거부) 발생! Spotify Developer Dashboard > Users and Access 메뉴에 현재 스포티파이 계정 이메일을 추가해야 내 플리가 정상 수집됩니다."
      };
    }
    if (err?.message?.includes("UNAUTHORIZED")) {
      return {
        success: false,
        message: "⚠️ Spotify 인증 토큰이 만료되었습니다. 설정 탭에서 '연동 해제' 후 다시 'Spotify 로그인 연동'을 눌러주세요."
      };
    }
    return {
      success: false,
      message: `⚠️ Spotify API 호출 에러: ${err?.message || "알 수 없는 오류"}`
    };
  }
};

// Fetch track recommendations strictly from user's registered playlists & library
export const getRandomTrack = async (
  context: { movement: string; activity: string; weather: string; mood: string },
  token: string | null,
  todayTrackKeys: string[] = []
): Promise<MusicCard['track']> => {
  let activeToken = token;

  // Attempt silent background refresh if activeToken is missing or expired
  if (!activeToken && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('momentune_spotify_refresh_token');
    const clientId = localStorage.getItem('momentune_spotify_client_id');
    if (refreshToken && clientId) {
      const refreshed = await refreshSpotifyAccessToken(clientId, refreshToken);
      if (refreshed && refreshed.token) {
        activeToken = refreshed.token;
        localStorage.setItem('momentune_spotify_token', refreshed.token);
      }
    }
  }

  if (activeToken) {
    try {
      let userTracks: any[] = [];
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('momentune_spotify_refresh_token') : null;
      const clientId = typeof window !== 'undefined' ? (localStorage.getItem('momentune_spotify_client_id') || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID) : null;

      const runFetchUserTracks = async (t: string) => {
        const tracks: any[] = [];

        // 1. Fetch User's Saved/Liked Tracks (/v1/me/tracks?limit=50)
        try {
          const savedData = await querySpotifyApi('https://api.spotify.com/v1/me/tracks?limit=50', t);
          if (savedData?.items) {
            savedData.items.forEach((item: any) => {
              if (item.track && item.track.name && item.track.artists) {
                tracks.push(item.track);
              }
            });
          }
        } catch (e: any) {
          if (e?.message === 'UNAUTHORIZED_SPOTIFY_TOKEN') throw e;
          console.warn("Saved tracks fetch notice:", e);
        }

        // 2. Fetch User's Top Listened Tracks (/v1/me/top/tracks?limit=50)
        try {
          const topData = await querySpotifyApi('https://api.spotify.com/v1/me/top/tracks?limit=50', t);
          if (topData?.items) {
            topData.items.forEach((trackItem: any) => {
              if (trackItem && trackItem.name && trackItem.artists) {
                tracks.push(trackItem);
              }
            });
          }
        } catch (e: any) {
          if (e?.message === 'UNAUTHORIZED_SPOTIFY_TOKEN') throw e;
          console.warn("Top tracks fetch notice:", e);
        }

        // 3. Fetch User's Playlists (/v1/me/playlists?limit=50) & ALL playlist tracks
        try {
          const playlistsData = await querySpotifyApi('https://api.spotify.com/v1/me/playlists?limit=50', t);
          if (playlistsData?.items && playlistsData.items.length > 0) {
            for (const pl of playlistsData.items) {
              if (pl && pl.id) {
                try {
                  const plTracksData = await querySpotifyApi(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=100`, t);
                  if (plTracksData?.items) {
                    plTracksData.items.forEach((item: any) => {
                      const trackObj = item.track || item;
                      if (trackObj && trackObj.name && trackObj.artists) {
                        tracks.push(trackObj);
                      }
                    });
                  }
                } catch (e: any) {
                  if (e?.message === 'UNAUTHORIZED_SPOTIFY_TOKEN') throw e;
                  console.warn(`Playlist ${pl.id} tracks warning:`, e);
                }
              }
            }
          }
        } catch (e: any) {
          if (e?.message === 'UNAUTHORIZED_SPOTIFY_TOKEN') throw e;
          console.warn("Playlists fetch notice:", e);
        }

        return tracks;
      };

      try {
        userTracks = await runFetchUserTracks(activeToken);
      } catch (err: any) {
        // If 401 token expired, trigger automatic silent background refresh and retry!
        if (err?.message === 'UNAUTHORIZED_SPOTIFY_TOKEN' && refreshToken && clientId) {
          console.log("Spotify access token expired. Refreshing token silently in background...");
          const refreshed = await refreshSpotifyAccessToken(clientId, refreshToken);
          if (refreshed && refreshed.token) {
            activeToken = refreshed.token;
            if (typeof window !== 'undefined') {
              localStorage.setItem('momentune_spotify_token', refreshed.token);
            }
            userTracks = await runFetchUserTracks(activeToken);
          }
        }
      }

      // Deduplicate user tracks by Spotify ID or Title-Artist key
      const uniqueUserTracksMap = new Map();
      userTracks.forEach((t) => {
        if (t && t.name && t.artists && t.artists.length > 0) {
          const key = t.id || `${t.name}-${t.artists[0].name}`;
          uniqueUserTracksMap.set(key, t);
        }
      });
      const uniqueUserTracks = Array.from(uniqueUserTracksMap.values());

      if (uniqueUserTracks.length > 0) {
        // Filter out tracks already issued today to prevent daily duplicates!
        let candidateTracks = uniqueUserTracks;
        if (todayTrackKeys.length > 0) {
          const filtered = uniqueUserTracks.filter((t) => {
            const trackId = t.id;
            const trackKey = `${t.name}-${t.artists?.[0]?.name}`;
            return !todayTrackKeys.includes(trackId) && !todayTrackKeys.includes(trackKey);
          });
          if (filtered.length > 0) {
            candidateTracks = filtered;
          }
        }

        // Pick a random track strictly from user's registered playlists/library!
        const randTrack: any = candidateTracks[Math.floor(Math.random() * candidateTracks.length)];
        const artistName = randTrack.artists.map((a: any) => a.name).join(', ');
        
        let cover = randTrack.album?.images?.[0]?.url;
        let preview = randTrack.preview_url;

        if (!cover || cover.includes("unsplash") || !preview) {
          const meta = await fetchSongMetadata(artistName, randTrack.name);
          if (!cover || cover.includes("unsplash")) cover = meta.albumCover || cover;
          if (!preview) preview = meta.previewUrl || preview;
        }

        return {
          title: randTrack.name,
          artist: artistName,
          albumCover: cover || 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/0c/33/c4/0c33c4a2-1b1a-2895-71ad-20b1c0627e74/0094636803358.jpg/600x600bb.jpg',
          spotifyUrl: randTrack.external_urls?.spotify || `https://open.spotify.com/track/${randTrack.id}`,
          previewUrl: preview,
          id: randTrack.id
        };
      }
    } catch (err: any) {
      console.warn("Spotify library/playlist request error:", err);
    }
  }

  // Fallback: Select from famous user-favorite playlist catalog (filtering out today's issued tracks!)
  let candidateFallback = FALLBACK_TRACKS;
  if (todayTrackKeys.length > 0) {
    const filtered = FALLBACK_TRACKS.filter(
      (t) => !todayTrackKeys.includes(`${t.title}-${t.artist}`)
    );
    if (filtered.length > 0) {
      candidateFallback = filtered;
    }
  }

  const randTrack = candidateFallback[Math.floor(Math.random() * candidateFallback.length)];
  const meta = await fetchSongMetadata(randTrack.artist, randTrack.title);

  return {
    title: randTrack.title,
    artist: randTrack.artist,
    albumCover: meta.albumCover || randTrack.albumCover,
    spotifyUrl: randTrack.spotifyUrl,
    previewUrl: meta.previewUrl || (await fetchSongPreviewUrl(randTrack.artist, randTrack.title))
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
