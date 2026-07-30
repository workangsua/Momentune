"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Archive,
  Settings as SettingsIcon,
  Music,
  Sparkles,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Check,
  X,
  Compass,
  AlertCircle,
  RotateCcw,
  Lock,
  Unlock
} from "lucide-react";
import { useStore, getLocalDateKey } from "../store/useStore";
import { getRandomTrack, redirectToSpotifyAuth, fetchSpotifyTokens } from "../utils/spotify";
import { generateAIReason } from "../utils/gemini";
import { MusicCard, AIPersona } from "../types";

export default function Home() {
  const {
    todayCards,
    historyCards,
    activeTab,
    spotifyClientId,
    spotifyToken,
    spotifyRefreshToken,
    spotifyUser,
    geminiKey,
    aiPersona,
    settingsPasscode,
    isHydrated,
    setActiveTab,
    addCard,
    deleteCard,
    setSpotifyClientId,
    setSpotifyToken,
    setGeminiKey,
    setAiPersona,
    setSettingsPasscode,
    clearHistory,
    hydrate
  } = useStore();

  // Load state on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Handle Spotify Redirect Callback
  useEffect(() => {
    if (!isHydrated) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      const handleSpotifyCallback = async () => {
        const storedClientId = localStorage.getItem("momentune_spotify_client_id") || spotifyClientId;
        if (!storedClientId) {
          console.error("No Spotify Client ID configured for callback exchange.");
          return;
        }

        const data = await fetchSpotifyTokens(storedClientId, code);
        if (data) {
          setSpotifyToken(data.token, data.refreshToken, data.user);
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      handleSpotifyCallback();
    }
  }, [isHydrated, spotifyClientId, setSpotifyToken]);

  // Settings passcode unlock state
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");

  // Context Selector Modal State
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<string>("");
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [selectedWeather, setSelectedWeather] = useState<string>("");
  const [selectedMood, setSelectedMood] = useState<string>("");
  
  // Generating Music Card Loading State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");

  // History filter
  const [historyFilterTag, setHistoryFilterTag] = useState<string>("");

  // Context Options definitions
  const movementOptions = ["출근/아침 이동", "퇴근/저녁 이동", "산책", "여행/드라이브"];
  const activityOptions = ["운동", "작업/공부", "휴식", "집안일", "멍때리기"];
  const weatherOptions = ["맑음", "흐림", "비", "눈", "꿉꿉함/습함"];
  const moodOptions = ["신남/에너지", "차분함", "몽환적", "센치함/우울", "피곤함"];

  // Config Input fields
  const [tempClientId, setTempClientId] = useState("");
  const [tempGeminiKey, setTempGeminiKey] = useState("");

  // Keep input fields synchronized with store state once hydrated
  useEffect(() => {
    if (isHydrated) {
      setTempClientId(spotifyClientId);
      setTempGeminiKey(geminiKey);
    }
  }, [isHydrated, spotifyClientId, geminiKey]);

  // Generate Music Card Handler
  const handleCreateCard = async () => {
    if (!selectedMovement || !selectedActivity || !selectedWeather || !selectedMood) {
      alert("모든 상태 항목을 하나씩 선택해 주세요!");
      return;
    }

    setIsGenerating(true);
    setGenerationStep("스포티파이 데이터베이스 탐색 중...");

    try {
      // 1. Fetch Spotify Track
      const track = await getRandomTrack(
        {
          movement: selectedMovement,
          activity: selectedActivity,
          weather: selectedWeather,
          mood: selectedMood,
        },
        spotifyToken
      );

      setGenerationStep("Gemini AI와 노래 추천 이유 싱크 중...");

      // 2. Fetch AI Reason
      const aiReason = await generateAIReason(
        {
          movement: selectedMovement,
          activity: selectedActivity,
          weather: selectedWeather,
          mood: selectedMood,
        },
        track,
        aiPersona,
        geminiKey || null
      );

      // 3. Assemble Card Object
      const newCard: MusicCard = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        dateKey: getLocalDateKey(),
        context: {
          movement: selectedMovement,
          activity: selectedActivity,
          weather: selectedWeather,
          mood: selectedMood,
        },
        track,
        aiReason,
      };

      // 4. Save to store
      addCard(newCard);

      // Close modal & reset selection
      setIsSelectorOpen(false);
      setSelectedMovement("");
      setSelectedActivity("");
      setSelectedWeather("");
      setSelectedMood("");
    } catch (error) {
      console.error(error);
      alert("카드 생성 실패. 다시 시도해 주세요.");
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  // Group history cards by date
  const getGroupedHistory = () => {
    const filtered = historyCards.filter((card) => {
      if (!historyFilterTag) return true;
      return (
        card.context.movement === historyFilterTag ||
        card.context.activity === historyFilterTag ||
        card.context.weather === historyFilterTag ||
        card.context.mood === historyFilterTag
      );
    });

    const groups: Record<string, MusicCard[]> = {};
    filtered.forEach((card) => {
      if (!groups[card.dateKey]) {
        groups[card.dateKey] = [];
      }
      groups[card.dateKey].push(card);
    });
    return groups;
  };

  // Collect all unique tags from history cards for filter bar
  const getHistoryTags = () => {
    const tags = new Set<string>();
    historyCards.forEach((card) => {
      if (card.context.movement) tags.add(card.context.movement);
      if (card.context.activity) tags.add(card.context.activity);
      if (card.context.weather) tags.add(card.context.weather);
      if (card.context.mood) tags.add(card.context.mood);
    });
    return Array.from(tags);
  };

  // Lock settings after leaving tab
  useEffect(() => {
    if (activeTab !== "settings") {
      setIsSettingsUnlocked(false);
      setInputPasscode("");
    }
  }, [activeTab]);

  const handleUnlockSettings = () => {
    if (inputPasscode === settingsPasscode) {
      setIsSettingsUnlocked(true);
      setInputPasscode("");
    } else {
      alert("비밀번호가 일치하지 않습니다!");
    }
  };

  const handleCreatePasscode = () => {
    if (!newPasscode.trim()) {
      alert("비밀번호를 입력해 주세요.");
      return;
    }
    setSettingsPasscode(newPasscode);
    setIsSettingsUnlocked(true);
    setNewPasscode("");
  };

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-50 text-zinc-500">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold tracking-wide">모멘튠 조율 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center pb-32 pt-10">
      {/* Header Logo */}
      <header className="mb-8 flex flex-col items-center text-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex items-baseline"
        >
          <h1 className="text-3xl font-black tracking-widest text-zinc-800 font-sans">MOMENTUNE</h1>
        </motion.div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md px-4 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {/* TAB 1: TODAY */}
          {activeTab === "today" && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 flex flex-col"
            >
              {todayCards.length === 0 ? (
                // Welcome screen if empty
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
                  <div className="relative mb-6">
                    <div className="absolute -inset-1 rounded-full bg-indigo-500/10 blur-xl"></div>
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-md">
                      <Music className="h-8 w-8 text-indigo-600" />
                    </div>
                  </div>
                  <h2 className="text-lg font-extrabold text-zinc-800">오늘의 음악 티켓</h2>
                  <p className="text-xs text-zinc-500 mt-2.5 max-w-xs leading-relaxed font-medium">
                    내 상황(이동, 활동, 날씨, 기분)을 조율해 보세요.<br />
                    AI가 오늘 들어야 하는 감성 음악 카드를 발급합니다.
                  </p>
                  
                  <button
                    onClick={() => setIsSelectorOpen(true)}
                    className="mt-8 flex items-center gap-2 rounded-full bg-indigo-650 px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-indigo-650/15 hover:bg-indigo-700 transition duration-300"
                  >
                    <Plus className="h-4 w-4" />
                    내 상태 기록하고 음악 카드 발급
                  </button>
                </div>
              ) : (
                // Timeline of today's cards
                <div className="flex flex-col gap-6">
                  {/* Summary Bar */}
                  <div className="flex justify-between items-center bg-white/80 border border-zinc-200/80 rounded-2xl p-4 shadow-sm">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-800">오늘 발급된 음악 티켓</h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">자정이 지나면 자동으로 HISTORY 보관소로 이동합니다.</p>
                    </div>
                    <button
                      onClick={() => setIsSelectorOpen(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-700 transition shadow-indigo-600/10"
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Cards list */}
                  <div className="flex flex-col gap-10">
                    {todayCards.map((card) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                      >
                        {/* Premium Ticket Card Body */}
                        <div className="bg-white border border-zinc-200/80 rounded-[32px] p-4 pb-6 flex flex-col relative overflow-hidden shadow-lg">
                          
                          {/* Inner soft-canvas visual block */}
                          <div className="aspect-square w-full rounded-2xl bg-[#e3e0d5] p-5 flex flex-col justify-between relative shadow-inner overflow-hidden">
                            {/* Top part of canvas: context chips */}
                            <div className="flex flex-wrap gap-1">
                              {Object.values(card.context).map((tag, tIdx) => tag && (
                                <span
                                  key={tIdx}
                                  className="inline-block rounded-full bg-black/5 border border-black/5 px-2.5 py-0.5 text-[9px] text-[#5c5643] font-bold"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Center of canvas: Album cover art with turntable detail */}
                            <div className="relative flex flex-col items-center justify-center my-auto">
                              <div className="relative h-28 w-28 flex-shrink-0 shadow-lg rounded-full overflow-hidden record-spin border border-black/10">
                                <img
                                  src={card.track.albumCover}
                                  alt="Cover"
                                  className="h-full w-full object-cover"
                                />
                                {/* Vinyl center cutout */}
                                <div className="absolute inset-0 bg-black/5 rounded-full flex items-center justify-center">
                                  <div className="h-6 w-6 rounded-full bg-[#1c1c1c] border-2 border-[#e3e0d5] flex items-center justify-center">
                                    <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Bottom part of canvas: meta indicators */}
                            <div className="flex justify-between items-end border-t border-[#c5c1b2] pt-2.5 mt-2">
                              <span className="text-[9px] text-[#78725d] font-bold font-mono uppercase tracking-wider">
                                MOMENTUNE STAMP
                              </span>
                              <span className="text-[9px] text-[#78725d] font-bold font-mono">
                                {new Date(card.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {/* Metadata row (Title, Artist, Delete) */}
                          <div className="mt-5 px-1">
                            <div className="flex justify-between items-start gap-4">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-base font-extrabold text-zinc-900 truncate tracking-tight">{card.track.title}</h4>
                                <p className="text-xs text-zinc-500 truncate mt-0.5 font-semibold">{card.track.artist}</p>
                              </div>
                              <button
                                onClick={() => deleteCard(card.id, false)}
                                className="text-zinc-400 hover:text-red-500 transition p-1.5 rounded-full hover:bg-zinc-100"
                                title="카드 삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* AI Curated Reason */}
                            <div className="mt-4 pt-3.5 border-t border-zinc-100">
                              <p className="text-xs text-zinc-700 leading-relaxed font-semibold italic whitespace-pre-line">
                                "{card.aiReason}"
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Protruding Ticket Stub (Spotify button with notches) */}
                        <a
                          href={card.track.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative -mt-4 mx-6 h-12 rounded-b-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 flex items-center justify-center border-t border-dashed border-white/20 shadow-md cursor-pointer group-hover:translate-y-0.5 transition duration-300"
                        >
                          {/* Cutout punch notches matching the light theme page bg gradient */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#eaeaea] border-r border-zinc-200"></div>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#eaeaea] border-l border-zinc-200"></div>

                          <div className="flex items-center gap-2 text-white font-black text-[10px] tracking-widest">
                            <Music className="h-3.5 w-3.5 animate-bounce" />
                            <span>SPOTIFY PLAY</span>
                            <ExternalLink className="h-3 w-3 opacity-80" />
                          </div>
                        </a>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: HISTORY */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 flex flex-col"
            >
              {historyCards.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-24 px-4">
                  <Archive className="h-10 w-10 text-zinc-400 mb-4" />
                  <h2 className="text-base font-bold text-zinc-800">보관된 티켓이 없습니다</h2>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed font-medium">
                    오늘이 지나 자정이 지나면,<br />
                    작성된 티켓들이 자동으로 보관함에 보관됩니다.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Vibe filter pills */}
                  <div className="bg-white border border-zinc-200/85 rounded-2xl p-4 shadow-sm">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">태그 필터</h3>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      <button
                        onClick={() => setHistoryFilterTag("")}
                        className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                          !historyFilterTag
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-zinc-100 text-zinc-650 border border-zinc-200/60 hover:bg-zinc-200/60"
                        }`}
                      >
                        전체
                      </button>
                      {getHistoryTags().map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setHistoryFilterTag(tag)}
                          className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                            historyFilterTag === tag
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-zinc-100 text-zinc-650 border border-zinc-200/60 hover:bg-zinc-200/60"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grouped Lists */}
                  <div className="flex flex-col gap-10">
                    {Object.entries(getGroupedHistory()).map(([date, cards]) => (
                      <div key={date} className="flex flex-col gap-5">
                        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 ml-1">
                          <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="text-xs font-black tracking-wider text-zinc-800 font-mono">{date}</span>
                          <span className="text-[10px] text-zinc-400 font-bold">({cards.length})</span>
                        </div>

                        <div className="flex flex-col gap-8">
                          {cards.map((card) => (
                            <div key={card.id} className="relative group">
                              <div className="bg-white border border-zinc-200/80 rounded-[32px] p-4 pb-6 flex flex-col relative overflow-hidden shadow-lg">
                                
                                {/* Inner visual */}
                                <div className="aspect-square w-full rounded-2xl bg-[#e3e0d5] p-5 flex flex-col justify-between relative shadow-inner overflow-hidden">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.values(card.context).map((tag, tIdx) => tag && (
                                      <span
                                        key={tIdx}
                                        className="inline-block rounded-full bg-black/5 border border-black/5 px-2.5 py-0.5 text-[9px] text-[#5c5643] font-bold"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>

                                  <div className="relative flex flex-col items-center justify-center my-auto">
                                    <div className="relative h-24 w-24 flex-shrink-0 shadow-lg rounded-full overflow-hidden record-spin border border-black/10">
                                      <img
                                        src={card.track.albumCover}
                                        alt="Cover"
                                        className="h-full w-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/5 rounded-full flex items-center justify-center">
                                        <div className="h-5 w-5 rounded-full bg-[#1c1c1c] border border-[#e3e0d5] flex items-center justify-center">
                                          <div className="h-1 w-1 rounded-full bg-white"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-end border-t border-[#c5c1b2] pt-2.5 mt-2">
                                    <span className="text-[9px] text-[#78725d] font-bold font-mono uppercase tracking-wider">
                                      ARCHIVE STAMP
                                    </span>
                                    <span className="text-[9px] text-[#78725d] font-bold font-mono">
                                      {new Date(card.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-5 px-1">
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-base font-extrabold text-zinc-900 truncate tracking-tight">{card.track.title}</h4>
                                      <p className="text-xs text-zinc-500 truncate mt-0.5 font-semibold">{card.track.artist}</p>
                                    </div>
                                    <button
                                      onClick={() => deleteCard(card.id, true)}
                                      className="text-zinc-400 hover:text-red-500 transition p-1 rounded-full hover:bg-zinc-100"
                                      title="카드 삭제"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="mt-4 pt-3.5 border-t border-zinc-100">
                                    <p className="text-xs text-zinc-700 leading-relaxed font-semibold italic whitespace-pre-line">
                                      "{card.aiReason}"
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <a
                                href={card.track.spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative -mt-4 mx-6 h-12 rounded-b-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 flex items-center justify-center border-t border-dashed border-white/20 shadow-md cursor-pointer group-hover:translate-y-0.5 transition duration-300"
                              >
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#eaeaea] border-r border-zinc-200"></div>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#eaeaea] border-l border-zinc-200"></div>

                                <div className="flex items-center gap-2 text-white font-black text-[10px] tracking-widest">
                                  <Music className="h-3.5 w-3.5 animate-bounce" />
                                  <span>SPOTIFY PLAY</span>
                                  <ExternalLink className="h-3 w-3 opacity-80" />
                                </div>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 flex flex-col gap-6"
            >
              {/* LOCK STATE PROTECTION PANEL */}
              {!settingsPasscode ? (
                // Setup Passcode Screen (First use)
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-md text-center py-10">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-4">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900">개인정보 설정 잠금 비밀번호 등록</h3>
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed px-4">
                    설정에 들어갈 수 있는 비밀번호를 생성해 주세요.<br />
                    등록한 스포티파이 ID와 Gemini API Key 정보를 보호합니다.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 max-w-xs mx-auto">
                    <input
                      type="password"
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      placeholder="비밀번호 설정 (예: 4자리 숫자)"
                      className="w-full text-center rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleCreatePasscode}
                      className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow hover:bg-indigo-700 transition"
                    >
                      비밀번호 등록 및 설정 열기
                    </button>
                  </div>
                </div>
              ) : !isSettingsUnlocked ? (
                // Unlock Screen
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-md text-center py-12">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 mb-4">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900">설정 탭 보호</h3>
                  <p className="text-xs text-zinc-500 mt-1">개인정보 보호를 위해 비밀번호를 입력해 주세요.</p>
                  <div className="mt-6 flex flex-col gap-3 max-w-xs mx-auto">
                    <input
                      type="password"
                      value={inputPasscode}
                      onChange={(e) => setInputPasscode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUnlockSettings()}
                      placeholder="비밀번호 입력"
                      className="w-full text-center rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleUnlockSettings}
                      className="w-full rounded-xl bg-zinc-800 py-3 text-xs font-bold text-white shadow hover:bg-zinc-900 transition"
                    >
                      잠금 해제
                    </button>
                  </div>
                </div>
              ) : (
                // Unlocked Settings content
                <>
                  {/* Unlock Notice Banner */}
                  <div className="flex justify-between items-center bg-zinc-100/80 border border-zinc-200/80 rounded-2xl p-3.5 mb-2 shadow-inner">
                    <span className="text-[10px] text-zinc-600 font-bold flex items-center gap-1.5">
                      <Unlock className="h-3.5 w-3.5 text-emerald-500" /> 개인정보 잠금 해제됨
                    </span>
                    <button
                      onClick={() => {
                        setIsSettingsUnlocked(false);
                        setInputPasscode("");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-zinc-700 text-[10px] font-bold hover:bg-zinc-50 transition shadow-sm"
                    >
                      다시 잠그기
                    </button>
                  </div>

                  {/* Spotify config panel */}
                  <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Music className="h-5 w-5 text-emerald-500" />
                      <h3 className="text-sm font-bold text-zinc-900">Spotify 계정 연동</h3>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                          Spotify Client ID
                        </label>
                        <input
                          type="text"
                          value={tempClientId}
                          onChange={(e) => setTempClientId(e.target.value)}
                          placeholder="Spotify Developer Client ID 입력"
                          className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3.5 py-3 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {spotifyToken ? (
                        <div className="bg-emerald-50/40 rounded-xl border border-emerald-100 p-3.5 mt-1 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500 font-semibold">연동 상태</span>
                            <span className="text-emerald-600 flex items-center gap-1 font-bold">
                              <Check className="h-3 w-3" /> 연동 완료
                            </span>
                          </div>
                          <div className="text-xs flex items-center justify-between text-zinc-500">
                            <span>사용자</span>
                            <span className="text-zinc-800 font-bold">{spotifyUser || '알 수 없음'}</span>
                          </div>
                          <button
                            onClick={() => setSpotifyToken(null, null, null)}
                            className="w-full mt-2 rounded-lg bg-zinc-100 border border-zinc-200 py-2.5 text-[10px] font-bold text-zinc-600 hover:text-zinc-800 hover:bg-zinc-200 transition"
                          >
                            연동 해제
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setSpotifyClientId(tempClientId);
                              redirectToSpotifyAuth(tempClientId);
                            }}
                            disabled={!tempClientId}
                            className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-white shadow-sm shadow-emerald-500/10 hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Spotify 로그인 연동
                          </button>
                          <p className="text-[10px] text-zinc-500 leading-normal px-1">
                            ※ 연동하지 않으면 미리 준비된 감성 음악 fallback 데이터베이스에서 추천 카드를 생성합니다. (Client ID는 Spotify Dashboard에 Redirect URI로 <code className="bg-zinc-100 px-1 rounded text-zinc-650">{typeof window !== 'undefined' ? window.location.origin + '/' : 'http://localhost:3000/'}</code>를 등록해야 연결됩니다.)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gemini AI config panel */}
                  <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                      <h3 className="text-sm font-bold text-zinc-900">Gemini AI 설정</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                          Gemini API Key
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={tempGeminiKey}
                            onChange={(e) => setTempGeminiKey(e.target.value)}
                            placeholder="Google Gemini API Key 입력"
                            className="flex-1 rounded-xl bg-zinc-50 border border-zinc-200 px-3.5 py-3 text-xs text-zinc-850 placeholder-zinc-400 focus:outline-none focus:border-indigo-500/50"
                          />
                          <button
                            onClick={() => {
                              setGeminiKey(tempGeminiKey);
                              alert("Gemini API 키가 저장되었습니다.");
                            }}
                            className="rounded-xl bg-indigo-650 px-4 text-xs font-bold text-white hover:bg-indigo-700 transition"
                          >
                            저장
                          </button>
                        </div>
                        {geminiKey ? (
                          <span className="inline-block mt-2 text-[10px] text-indigo-600 font-bold">
                            ✓ API Key 활성화됨
                          </span>
                        ) : (
                          <span className="inline-block mt-2 text-[10px] text-yellow-600 font-bold flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> 키 미입력 상태 (테스트 데모 큐레이션 제공)
                          </span>
                        )}
                      </div>

                      {/* Persona settings */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                          AI 큐레이션 페르소나 설정
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: "witty", label: "위트 🤪", desc: "재치 있고 위트 가득" },
                            { key: "emotional", label: "감성 🕯️", desc: "서정적이고 따뜻함" },
                            { key: "direct", label: "직설 🥊", desc: "솔직하고 직설적" },
                            { key: "tpo", label: "TPO ⏰", desc: "상황/시간 밀착형" }
                          ].map((item) => (
                            <button
                              key={item.key}
                              onClick={() => setAiPersona(item.key as AIPersona)}
                              className={`rounded-xl border p-3 text-left transition ${
                                aiPersona === item.key
                                  ? "bg-indigo-50 border-indigo-250 text-indigo-700 shadow-sm"
                                  : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                              }`}
                            >
                              <div className="text-xs font-bold">{item.label}</div>
                              <div className="text-[10px] text-zinc-400 mt-1">{item.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Passcode Reset / Data settings */}
                  <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-zinc-500 mb-3">비밀번호 및 데이터 설정</h3>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          if (confirm("정말 개인정보 비밀번호를 초기화하시겠습니까? (연동 정보 등은 유지됩니다)")) {
                            setSettingsPasscode(null);
                            setIsSettingsUnlocked(false);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3.5 text-xs font-bold text-zinc-650 hover:bg-zinc-50 transition"
                      >
                        설정 잠금 비밀번호 재설정 (Reset)
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("정말 전체 역사 기록 카드를 삭제하시겠습니까?")) {
                            clearHistory();
                            alert("히스토리가 초기화되었습니다.");
                          }
                        }}
                        disabled={historyCards.length === 0}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/30 py-3.5 text-xs font-bold text-red-500 hover:bg-red-50/50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        기록 탭 보관소 완전히 비우기
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Bottom Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
        <div className="bg-white/90 border border-zinc-200/80 backdrop-blur-md rounded-full px-5 py-3.5 flex justify-around items-center shadow-2xl">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "today" ? "text-indigo-600" : "text-zinc-450 hover:text-zinc-600"
            }`}
          >
            <Compass className="h-5 w-5" />
            <span className="text-[9px] font-bold tracking-wider">TODAY</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "history" ? "text-indigo-600" : "text-zinc-450 hover:text-zinc-600"
            }`}
          >
            <Archive className="h-5 w-5" />
            <span className="text-[9px] font-bold tracking-wider">HISTORY</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "settings" ? "text-indigo-600" : "text-zinc-450 hover:text-zinc-600"
            }`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span className="text-[9px] font-bold tracking-wider">SETTINGS</span>
          </button>
        </div>
      </nav>

      {/* MODAL: Context Selector Step-by-Step */}
      <AnimatePresence>
        {isSelectorOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
            {/* Modal backdrop closer */}
            <div className="absolute inset-0" onClick={() => !isGenerating && setIsSelectorOpen(false)}></div>

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md rounded-t-[32px] bg-white border-t border-zinc-250 p-6 z-10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Close handler */}
              {!isGenerating && (
                <button
                  onClick={() => setIsSelectorOpen(false)}
                  className="absolute right-5 top-5 h-8 w-8 flex items-center justify-center rounded-full bg-zinc-100 border border-zinc-200 text-zinc-500 hover:text-zinc-800"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              <div className="flex items-center gap-2 mb-6">
                <Compass className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-zinc-950">현재의 소리 기록하기</h3>
              </div>

              {isGenerating ? (
                // Loading screen during generation
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative mb-6">
                    <div className="absolute -inset-1 rounded-full bg-indigo-500/10 blur-xl"></div>
                    <Loader2 className="relative h-12 w-12 text-indigo-600 animate-spin" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-950">음악 카드 제조 중...</h4>
                  <p className="text-xs text-zinc-500 mt-2 tracking-wide font-medium">{generationStep}</p>
                </div>
              ) : (
                // Step selections
                <div className="flex flex-col gap-5 pb-6">
                  {/* Category 1: Movement */}
                  <div>
                    <span className="block text-xs font-bold text-zinc-500 mb-2">1. 어디로 가고 있나요? (이동)</span>
                    <div className="flex flex-wrap gap-2">
                      {movementOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSelectedMovement(opt)}
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition font-semibold ${
                            selectedMovement === opt
                              ? "bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm"
                              : "bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-150"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category 2: Activity */}
                  <div>
                    <span className="block text-xs font-bold text-zinc-500 mb-2">2. 무엇을 하고 있나요? (활동)</span>
                    <div className="flex flex-wrap gap-2">
                      {activityOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSelectedActivity(opt)}
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition font-semibold ${
                            selectedActivity === opt
                              ? "bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm"
                              : "bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-150"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category 3: Weather */}
                  <div>
                    <span className="block text-xs font-bold text-zinc-500 mb-2">3. 바깥 날씨는 어떤가요? (날씨)</span>
                    <div className="flex flex-wrap gap-2">
                      {weatherOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSelectedWeather(opt)}
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition font-semibold ${
                            selectedWeather === opt
                              ? "bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm"
                              : "bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-150"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category 4: Mood */}
                  <div>
                    <span className="block text-xs font-bold text-zinc-500 mb-2">4. 지금 마음은 어떤가요? (기분)</span>
                    <div className="flex flex-wrap gap-2">
                      {moodOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSelectedMood(opt)}
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition font-semibold ${
                            selectedMood === opt
                              ? "bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm"
                              : "bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-150"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <button
                    onClick={handleCreateCard}
                    disabled={!selectedMovement || !selectedActivity || !selectedWeather || !selectedMood}
                    className="w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed mt-4 shadow-md shadow-indigo-600/20"
                  >
                    AI 큐레이션 카드 추천받기
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
