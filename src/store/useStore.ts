import { create } from 'zustand';
import { MusicCard, AIPersona } from '../types';

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
  isHydrated: boolean;
  
  // Actions
  setActiveTab: (tab: 'today' | 'history' | 'settings') => void;
  addCard: (card: MusicCard) => void;
  deleteCard: (id: string, isHistory: boolean) => void;
  setSpotifyClientId: (clientId: string) => void;
  setSpotifyToken: (token: string | null, refreshToken: string | null, user: string | null) => void;
  setGeminiKey: (key: string) => void;
  setAiPersona: (persona: AIPersona) => void;
  setSettingsPasscode: (passcode: string | null) => void;
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
  isHydrated: false,

  setActiveTab: (tab) => set({ activeTab: tab }),

  addCard: (card) => {
    const updated = [card, ...get().todayCards];
    set({ todayCards: updated });
    if (typeof window !== 'undefined') {
      localStorage.setItem('momentune_today_cards', JSON.stringify(updated));
    }
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
      if (passcode) localStorage.setItem('momentune_settings_passcode', passcode);
      else localStorage.removeItem('momentune_settings_passcode');
    }
  },

  clearHistory: () => {
    set({ historyCards: [] });
    if (typeof window !== 'undefined') {
      localStorage.setItem('momentune_history_cards', JSON.stringify([]));
    }
  },

  archiveOldCards: () => {
    const todayStr = getLocalDateKey();
    const todayList = get().todayCards;
    const historyList = get().historyCards;

    const cardsToKeep: MusicCard[] = [];
    const cardsToArchive: MusicCard[] = [];

    todayList.forEach((card) => {
      if (card.dateKey === todayStr) {
        cardsToKeep.push(card);
      } else {
        cardsToArchive.push(card);
      }
    });

    if (cardsToArchive.length > 0) {
      // Append older cards to history
      const newHistory = [...cardsToArchive, ...historyList];
      // Sort history by date descending
      newHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      set({
        todayCards: cardsToKeep,
        historyCards: newHistory
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('momentune_today_cards', JSON.stringify(cardsToKeep));
        localStorage.setItem('momentune_history_cards', JSON.stringify(newHistory));
      }
    }
  },

  hydrate: () => {
    if (typeof window === 'undefined' || get().isHydrated) return;

    try {
      const todayCardsRaw = localStorage.getItem('momentune_today_cards');
      const historyCardsRaw = localStorage.getItem('momentune_history_cards');
      const spotifyClientId = localStorage.getItem('momentune_spotify_client_id') || '';
      const spotifyToken = localStorage.getItem('momentune_spotify_token');
      const spotifyRefreshToken = localStorage.getItem('momentune_spotify_refresh_token');
      const spotifyUser = localStorage.getItem('momentune_spotify_user');
      const geminiKey = localStorage.getItem('momentune_gemini_key') || '';
      const aiPersona = (localStorage.getItem('momentune_ai_persona') as AIPersona) || 'emotional';
      const settingsPasscode = localStorage.getItem('momentune_settings_passcode') || null;

      const todayCards: MusicCard[] = todayCardsRaw ? JSON.parse(todayCardsRaw) : [];
      const historyCards: MusicCard[] = historyCardsRaw ? JSON.parse(historyCardsRaw) : [];

      set({
        todayCards,
        historyCards,
        spotifyClientId,
        spotifyToken,
        spotifyRefreshToken,
        spotifyUser,
        geminiKey,
        aiPersona,
        settingsPasscode,
        isHydrated: true
      });

      // Run archive check right after hydration
      get().archiveOldCards();
    } catch (e) {
      console.error('Failed to hydrate state', e);
      set({ isHydrated: true });
    }
  }
}));
