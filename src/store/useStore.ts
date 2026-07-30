import { create } from 'zustand';
import { MusicCard, AIPersona } from '../types';
import { fetchCardsFromSupabase, insertCardToSupabase, deleteCardFromSupabase } from '../utils/supabase';

interface StoreState {
  todayCards: MusicCard[];
  historyCards: MusicCard[];
  activeTab: 'today' | 'history' | 'settings';
  spotifyClientId: string;
  spotifyToken: string | null;
  spotifyRefreshToken: string | null;
  spotifyUser: string | null;
  geminiKey: string;
  aiPersona: AIPersona;
  settingsPasscode: string | null;
  supabaseUrl: string;
  supabaseKey: string;
  isHydrated: boolean;
  isSyncing: boolean;

  // Actions
  setActiveTab: (tab: 'today' | 'history' | 'settings') => void;
  addCard: (card: MusicCard) => void;
  deleteCard: (id: string, isHistory: boolean) => void;
  setSpotifyClientId: (clientId: string) => void;
  setSpotifyToken: (token: string | null, refreshToken: string | null, user: string | null) => void;
  setGeminiKey: (key: string) => void;
  setAiPersona: (persona: AIPersona) => void;
  setSettingsPasscode: (passcode: string | null) => void;
  setSupabaseConfig: (url: string, key: string) => void;
  syncWithCloud: () => Promise<void>;
  clearHistory: () => void;
  
  // Archive Logic
  archiveOldCards: () => void;
  hydrate: () => void;
}

// Format date to local YYYY-MM-DD
export const getLocalDateKey = (dateInput?: Date): string => {
  const d = dateInput || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useStore = create<StoreState>((set, get) => ({
  todayCards: [],
  historyCards: [],
  activeTab: 'today',
  spotifyClientId: '',
  spotifyToken: null,
  spotifyRefreshToken: null,
  spotifyUser: null,
  geminiKey: '',
  aiPersona: 'emotional',
  settingsPasscode: null,
  supabaseUrl: '',
  supabaseKey: '',
  isHydrated: false,
  isSyncing: false,

  setActiveTab: (tab) => set({ activeTab: tab }),

  addCard: (card) => {
    const updated = [card, ...get().todayCards];
    set({ todayCards: updated });
    if (typeof window !== 'undefined') {
      localStorage.setItem('momentune_today_cards', JSON.stringify(updated));
    }
    // Insert into Supabase PostgreSQL DB if configured
    insertCardToSupabase(card);
    // Push update to global cloud sync API
    get().syncWithCloud();
  },

  deleteCard: (id, isHistory) => {
    if (isHistory) {
      const updated = get().historyCards.filter((c) => c.id !== id);
      set({ historyCards: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem('momentune_history_cards', JSON.stringify(updated));
      }
    } else {
      const updated = get().todayCards.filter((c) => c.id !== id);
      set({ todayCards: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem('momentune_today_cards', JSON.stringify(updated));
      }
    }
    // Delete from Supabase PostgreSQL DB if configured
    deleteCardFromSupabase(id);
    // Push update to global cloud sync API
    get().syncWithCloud();
  },

  setSpotifyClientId: (clientId) => {
    set({ spotifyClientId: clientId });
    if (typeof window !== 'undefined') {
      localStorage.setItem('momentune_spotify_client_id', clientId);
    }
  },

  setSpotifyToken: (token, refreshToken, user) => {
    set({ spotifyToken: token, spotifyRefreshToken: refreshToken, spotifyUser: user });
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('momentune_spotify_token', token);
      else localStorage.removeItem('momentune_spotify_token');
      
      if (refreshToken) localStorage.setItem('momentune_spotify_refresh_token', refreshToken);
      else localStorage.removeItem('momentune_spotify_refresh_token');
      
      if (user) localStorage.setItem('momentune_spotify_user', user);
      else localStorage.removeItem('momentune_spotify_user');
    }
  },

  setGeminiKey: (key) => {
    set({ geminiKey: key });
    if (typeof window !== 'undefined') {
      localStorage.setItem('momentune_gemini_key', key);
    }
  },

  setAiPersona: (persona) => {
    set({ aiPersona: persona });
    if (typeof window !== 'undefined') {
      localStorage.setItem('momentune_ai_persona', persona);
    }
  },

  setSettingsPasscode: (passcode) => {
    set({ settingsPasscode: passcode });
    if (typeof window !== 'undefined') {
      if (passcode) localStorage.setItem('momentune_passcode', passcode);
      else localStorage.removeItem('momentune_passcode');
    }
  },

  setSupabaseConfig: (url, key) => {
    const trimmedUrl = url.trim();
    const trimmedKey = key.trim();
    set({ supabaseUrl: trimmedUrl, supabaseKey: trimmedKey });
    if (typeof window !== 'undefined') {
      if (trimmedUrl && trimmedKey) {
        localStorage.setItem('momentune_supabase_url', trimmedUrl);
        localStorage.setItem('momentune_supabase_key', trimmedKey);
      } else {
        localStorage.removeItem('momentune_supabase_url');
        localStorage.removeItem('momentune_supabase_key');
      }
    }
    get().syncWithCloud();
  },

  syncWithCloud: async () => {
    set({ isSyncing: true });
    try {
      let fetchedCards: MusicCard[] = [];

      // 1. Try fetching from Supabase first if configured
      const supabaseCards = await fetchCardsFromSupabase();
      if (supabaseCards && supabaseCards.length > 0) {
        fetchedCards = supabaseCards;
      }

      // 2. Fetch from built-in global serverless API (/api/sync)
      const res = await fetch('/api/sync', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const apiCards = [...(data.todayCards || []), ...(data.historyCards || [])];
        fetchedCards = [...fetchedCards, ...apiCards];
      }

      const todayKey = getLocalDateKey();
      const localToday = get().todayCards;
      const localHistory = get().historyCards;

      // Merge local + fetched cards by card ID
      const cardMap = new Map<string, MusicCard>();
      [...localToday, ...localHistory, ...fetchedCards].forEach((c) => {
        if (c && c.id) cardMap.set(c.id, c);
      });

      const allMerged = Array.from(cardMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const todayCards = allMerged.filter((c) => c.dateKey === todayKey);
      const historyCards = allMerged.filter((c) => c.dateKey !== todayKey);

      set({ todayCards, historyCards });

      if (typeof window !== 'undefined') {
        localStorage.setItem('momentune_today_cards', JSON.stringify(todayCards));
        localStorage.setItem('momentune_history_cards', JSON.stringify(historyCards));
      }

      // 3. Push merged cards back to serverless cloud API
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todayCards, historyCards }),
      });
    } catch (err) {
      console.warn("Cloud sync warning:", err);
    } finally {
      set({ isSyncing: false });
    }
  },

  clearHistory: () => {
    set({ historyCards: [] });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('momentune_history_cards');
    }
    get().syncWithCloud();
  },

  archiveOldCards: () => {
    const today = getLocalDateKey();
    const currentTodayCards = get().todayCards;
    const currentHistoryCards = get().historyCards;

    const cardsToKeep: MusicCard[] = [];
    const cardsToArchive: MusicCard[] = [];

    currentTodayCards.forEach((card) => {
      if (card.dateKey === today) {
        cardsToKeep.push(card);
      } else {
        cardsToArchive.push(card);
      }
    });

    if (cardsToArchive.length > 0) {
      const newHistory = [...cardsToArchive, ...currentHistoryCards];
      set({
        todayCards: cardsToKeep,
        historyCards: newHistory,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('momentune_today_cards', JSON.stringify(cardsToKeep));
        localStorage.setItem('momentune_history_cards', JSON.stringify(newHistory));
      }
    }
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;

    try {
      const storedToday = localStorage.getItem('momentune_today_cards');
      const storedHistory = localStorage.getItem('momentune_history_cards');
      const storedClientId = localStorage.getItem('momentune_spotify_client_id');
      const storedToken = localStorage.getItem('momentune_spotify_token');
      const storedRefreshToken = localStorage.getItem('momentune_spotify_refresh_token');
      const storedUser = localStorage.getItem('momentune_spotify_user');
      const storedGeminiKey = localStorage.getItem('momentune_gemini_key');
      const storedPersona = localStorage.getItem('momentune_ai_persona');
      const storedPasscode = localStorage.getItem('momentune_passcode');
      const storedSbUrl = localStorage.getItem('momentune_supabase_url');
      const storedSbKey = localStorage.getItem('momentune_supabase_key');

      set({
        todayCards: storedToday ? JSON.parse(storedToday) : [],
        historyCards: storedHistory ? JSON.parse(storedHistory) : [],
        spotifyClientId: storedClientId || '',
        spotifyToken: storedToken || null,
        spotifyRefreshToken: storedRefreshToken || null,
        spotifyUser: storedUser || null,
        geminiKey: storedGeminiKey || '',
        aiPersona: (storedPersona as AIPersona) || 'emotional',
        settingsPasscode: storedPasscode || null,
        supabaseUrl: storedSbUrl || '',
        supabaseKey: storedSbKey || '',
        isHydrated: true,
      });

      // Run automatic date archiving
      get().archiveOldCards();

      // Trigger automatic cloud sync
      get().syncWithCloud();
    } catch (e) {
      console.error("Hydration error:", e);
      set({ isHydrated: true });
    }
  },
}));
