export interface MusicCard {
  id: string;                  // UUID
  createdAt: string;           // ISO String (e.g., 2026-04-18T08:30:00Z)
  dateKey: string;             // YYYY-MM-DD (For midnight archiving / grouping)
  context: {
    movement: string;          // Movement context
    activity: string;          // Activity context
    weather: string;           // Weather context
    mood: string;              // Mood context
  };
  track: {
    title: string;             // Track title
    artist: string;            // Artist name
    albumCover: string;        // Album cover URL
    spotifyUrl: string;        // Spotify deep link or web player link
    id?: string;               // Spotify track ID (optional)
  };
  aiReason: string;            // AI-generated recommendation reason
}

export type AIPersona = 'witty' | 'emotional' | 'direct' | 'tpo';

export interface ContextOptions {
  movement: string[];
  activity: string[];
  weather: string[];
  mood: string[];
}
