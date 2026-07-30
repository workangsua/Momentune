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
  Unlock,
  ChevronLeft,
  ChevronRight
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

  // Active Index for Today Cards Carousel
  const [activeIndex, setActiveIndex] = useState(0);

  // Set activeIndex to 0 when a new card is added
  useEffect(() => {
    setActiveIndex(0);
  }, [todayCards.length]);

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
      <div className="flex h-screen w-screen items-center justify-center bg-[#020408] text-zinc-550">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-semibold tracking-wide">모멘튠 조율 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center pb-32 pt-10 relative">
      {/* Premium Ambient Blue Glowing Lights (Dark theme mode) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-25%] left-[-25%] w-[80vw] h-[80vw] rounded-full bg-blue-650/8 blur-[130px]" />
        <div className="absolute bottom-[-25%] right-[-25%] w-[80vw] h-[80vw] rounded-full bg-indigo-650/8 blur-[130px]" />
      </div>

      {/* Header Logo */}
      <header className="mb-8 flex flex-col items-center text-center px-4 z-10">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex items-baseline"
        >
          <h1 className="text-3xl font-black tracking-widest text-zinc-100 font-sans">MOMENTUNE</h1>
        </motion.div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md px-4 flex-1 flex flex-col z-10">
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
                    <div className="absolute -inset-1 rounded-full bg-blue-500/10 blur-xl"></div>
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-md">
                      <Music className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                  <h2 className="text-lg font-extrabold text-zinc-200">오늘의 음악 티켓</h2>
                  <p className="text-xs text-zinc-400 mt-2.5 max-w-xs leading-relaxed font-medium">
                    내 상황(이동, 활동, 날씨, 기분)을 조율해 보세요.<br />
                    AI가 오늘 들어야 하는 감성 음악 카드를 발급합니다.
                  </p>
                  
                  <button
                    onClick={() => setIsSelectorOpen(true)}
                    className="mt-8 flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition duration-300"
                  >
                    <Plus className="h-4 w-4" />
                    내 상태 기록하고 음악 카드 발급
                  </button>
                </div>
              ) : (
                // 3D Carousel Coverflow of today's cards
                <div className="flex flex-col gap-4 flex-1 justify-center py-2">
                  {/* Summary Bar */}
                  <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-4 shadow-sm backdrop-blur-md">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-300">오늘 발급된 음악 티켓</h3>
                      <p className="text-[10px] text-zinc-550 mt-0.5 font-medium">옆으로 밀거나 아래 버튼으로 넘겨 보세요.</p>
                    </div>
                    <button
                      onClick={() => setIsSelectorOpen(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 transition shadow-blue-600/10"
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* 3D Swipe Stack Container */}
                  <div className="relative h-[510px] w-full flex items-center justify-center overflow-visible mt-4">
                    <AnimatePresence initial={false}>
                      {todayCards.map((card, idx) => {
                        const offset = idx - activeIndex;
                        const isActive = offset === 0;
                        const isVisible = Math.abs(offset) <= 1;

                        if (!isVisible) return null;

                        return (
                          <motion.div
                            key={card.id}
                            style={{
                              pointerEvents: isActive ? "auto" : "none"
                            }}
                            animate={{
                              x: offset * 115, // horizontal spacing offset
                              scale: isActive ? 1 : 0.86,
                              rotate: offset * 3, // slightly tilt neighboring cards
                              zIndex: 10 - Math.abs(offset),
                              opacity: isActive ? 1 : 0.45,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 350,
                              damping: 28
                            }}
                            drag={isActive ? "x" : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragEnd={(e, info) => {
                              const swipeThreshold = 50;
                              if (info.offset.x < -swipeThreshold && activeIndex < todayCards.length - 1) {
                                setActiveIndex(activeIndex + 1);
                              } else if (info.offset.x > swipeThreshold && activeIndex > 0) {
                                setActiveIndex(activeIndex - 1);
                              }
                            }}
                            className="absolute w-full max-w-[310px] overflow-visible"
                          >
                            {/* Protruding Blue Tab Layered BEHIND the Main Card (Matches User Sketch Mockup 100%) */}
                            <a
                              href={card.track.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 w-[84%] h-20 rounded-b-[24px] bg-gradient-to-b from-[#0080ff] to-[#0055ff] flex items-end justify-center pb-2.5 shadow-lg cursor-pointer transition-transform hover:translate-y-0.5 z-0 group border border-blue-400/30"
                            >
                              <div className="flex items-center gap-2 text-white font-black text-[10px] tracking-widest drop-shadow-sm mb-0.5">
                                <Music className="h-3.5 w-3.5 animate-pulse text-white" />
                                <span>SPOTIFY PLAY</span>
                                <ExternalLink className="h-3 w-3 opacity-80" />
                              </div>
                            </a>

                            {/* Main Card Layered IN FRONT of the Blue Tab */}
                            <div className="relative z-10 bg-white/5 border border-white/15 rounded-[32px] p-4 pb-6 flex flex-col overflow-hidden shadow-2xl backdrop-blur-2xl">
                              {/* Soft Inner Blue Tint Blend */}
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/10 to-blue-600/40 pointer-events-none -z-10" />

                              {/* Album Cover Art */}
                              <div className="relative aspect-square w-full rounded-[24px] overflow-hidden border border-white/10 shadow-inner bg-black/20">
                                <img
                                  src={card.track.albumCover}
                                  alt="Album Cover"
                                  className="h-full w-full object-cover"
                                />
                                
                                {/* Situation chips */}
                                <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                                  {Object.values(card.context).map((tag, tIdx) => tag && (
                                    <span
                                      key={tIdx}
                                      className="inline-block rounded-full bg-black/50 backdrop-blur-md border border-white/10 px-2.5 py-0.5 text-[9px] text-zinc-300 font-bold"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>

                                {/* Timestamp */}
                                <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md">
                                  <span className="text-[9px] text-zinc-300 font-bold font-mono">
                                    {new Date(card.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>

                              {/* Text info inside main card */}
                              <div className="mt-5 px-1 flex flex-col text-left">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-xl font-extrabold text-white truncate tracking-tight drop-shadow-sm">{card.track.title}</h4>
                                    <p className="text-xs text-blue-300 font-bold tracking-wide uppercase mt-1 drop-shadow-sm">{card.track.artist}</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      deleteCard(card.id, false);
                                      if (activeIndex > 0) setActiveIndex(activeIndex - 1);
                                    }}
                                    className="text-zinc-400 hover:text-red-400 transition p-1.5 rounded-full hover:bg-white/10"
                                    title="카드 삭제"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>

                                {/* AI Curated Reason */}
                                <div className="mt-4 pt-3.5 border-t border-white/10">
                                  <p className="text-xs text-zinc-200 leading-relaxed font-semibold drop-shadow-sm">
                                    {card.aiReason.replace(/^["'“”]+|["'“”]+$/g, '')}
                                  </p>
                                </div>
                              </div>
                            </div>

                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Navigation Helper Buttons and Indicators */}
                  {todayCards.length > 1 && (
                    <div className="flex flex-col items-center gap-3 mt-2">
                      <div className="flex items-center gap-8">
                        <button
                          onClick={() => activeIndex > 0 && setActiveIndex(activeIndex - 1)}
                          disabled={activeIndex === 0}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-355 hover:text-white disabled:opacity-30 transition"
                        >
                          <ChevronLeft className="h-4.5 w-4.5" />
                        </button>
                        
                        <span className="text-xs font-bold font-mono text-zinc-400 tracking-wider">
                          {activeIndex + 1} <span className="text-zinc-650">/</span> {todayCards.length}
                        </span>

                        <button
                          onClick={() => activeIndex < todayCards.length - 1 && setActiveIndex(activeIndex + 1)}
                          disabled={activeIndex === todayCards.length - 1}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-355 hover:text-white disabled:opacity-30 transition"
                        >
                          <ChevronRight className="h-4.5 w-4.5" />
                        </button>
                      </div>

                      {/* Swipe Dots */}
                      <div className="flex justify-center gap-1.5">
                        {todayCards.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-350 ${
                              activeIndex === idx ? "w-6 bg-blue-500" : "w-1.5 bg-zinc-700/60"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
                  <Archive className="h-10 w-10 text-zinc-550 mb-4" />
                  <h2 className="text-base font-bold text-zinc-300">보관된 티켓이 없습니다</h2>
                  <p className="text-xs text-zinc-555 mt-1 max-w-xs leading-relaxed font-medium">
                    오늘이 지나 자정이 지나면,<br />
                    작성된 티켓들이 자동으로 보관함에 보관됩니다.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Vibe filter pills */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-sm backdrop-blur-md">
                    <h3 className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest mb-3">태그 필터</h3>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      <button
                        onClick={() => setHistoryFilterTag("")}
                        className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                          !historyFilterTag
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
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
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
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
                        <div className="flex items-center gap-2 border-b border-white/10 pb-2 ml-1">
                          <Calendar className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-xs font-black tracking-wider text-zinc-300 font-mono">{date}</span>
                          <span className="text-[10px] text-zinc-500 font-bold">({cards.length})</span>
                        </div>

                        <div className="flex flex-col gap-8">
                          {cards.map((card) => (
                            <div key={card.id} className="relative group overflow-visible">
                              {/* Protruding Blue Tab Layered BEHIND Main Card */}
                              <a
                                href={card.track.spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 w-[84%] h-20 rounded-b-[24px] bg-gradient-to-b from-[#0080ff] to-[#0055ff] flex items-end justify-center pb-2.5 shadow-lg cursor-pointer transition-transform hover:translate-y-0.5 z-0 group border border-blue-400/30"
                              >
                                <div className="flex items-center gap-2 text-white font-black text-[10px] tracking-widest drop-shadow-sm mb-0.5">
                                  <Music className="h-3.5 w-3.5 animate-pulse text-white" />
                                  <span>SPOTIFY PLAY</span>
                                  <ExternalLink className="h-3 w-3 opacity-80" />
                                </div>
                              </a>

                              {/* Main Card Layered IN FRONT */}
                              <div className="relative z-10 bg-white/5 border border-white/15 rounded-[32px] p-4 pb-6 flex flex-col overflow-hidden shadow-2xl backdrop-blur-2xl">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/10 to-blue-600/40 pointer-events-none -z-10" />

                                {/* Album Cover */}
                                <div className="relative aspect-square w-full rounded-[24px] overflow-hidden border border-white/10 shadow-inner bg-black/20">
                                  <img
                                    src={card.track.albumCover}
                                    alt="Album Cover"
                                    className="h-full w-full object-cover"
                                  />
                                  
                                  {/* chips */}
                                  <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                                    {Object.values(card.context).map((tag, tIdx) => tag && (
                                      <span
                                        key={tIdx}
                                        className="inline-block rounded-full bg-black/50 backdrop-blur-md border border-white/10 px-2.5 py-0.5 text-[9px] text-zinc-300 font-bold"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>

                                  {/* stamp */}
                                  <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md">
                                    <span className="text-[9px] text-zinc-300 font-bold font-mono">
                                      {new Date(card.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>

                                {/* Title & Artist */}
                                <div className="mt-5 px-1 flex flex-col text-left">
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-xl font-extrabold text-white truncate tracking-tight drop-shadow-sm">{card.track.title}</h4>
                                      <p className="text-xs text-blue-300 font-bold tracking-wide uppercase mt-1 drop-shadow-sm">{card.track.artist}</p>
                                    </div>
                                    <button
                                      onClick={() => deleteCard(card.id, true)}
                                      className="text-zinc-400 hover:text-red-400 transition p-1.5 rounded-full hover:bg-white/10"
                                      title="카드 삭제"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  {/* AI Curated Reason */}
                                  <div className="mt-4 pt-3.5 border-t border-white/10">
                                    <p className="text-xs text-zinc-200 leading-relaxed font-semibold drop-shadow-sm">
                                      {card.aiReason.replace(/^["'“”]+|["'“”]+$/g, '')}
                                    </p>
                                  </div>
                                </div>
                              </div>

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
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-md text-center py-10 backdrop-blur-md">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/5 text-blue-500 mb-4">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-200">개인정보 설정 잠금 비밀번호 등록</h3>
                  <p className="text-xs text-zinc-455 mt-2 leading-relaxed px-4">
                    설정에 들어갈 수 있는 비밀번호를 생성해 주세요.<br />
                    등록한 스포티파이 ID와 Gemini API Key 정보를 보호합니다.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 max-w-xs mx-auto">
                    <input
                      type="password"
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      placeholder="비밀번호 설정 (예: 4자리 숫자)"
                      className="w-full text-center rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 text-white"
                    />
                    <button
                      onClick={handleCreatePasscode}
                      className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow hover:bg-blue-750 transition"
                    >
                      비밀번호 등록 및 설정 열기
                    </button>
                  </div>
                </div>
              ) : !isSettingsUnlocked ? (
                // Unlock Screen
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-md text-center py-12 backdrop-blur-md">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/5 text-zinc-400 mb-4">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-200">설정 탭 보호</h3>
                  <p className="text-xs text-zinc-455 mt-1">개인정보 보호를 위해 비밀번호를 입력해 주세요.</p>
                  <div className="mt-6 flex flex-col gap-3 max-w-xs mx-auto">
                    <input
                      type="password"
                      value={inputPasscode}
                      onChange={(e) => setInputPasscode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUnlockSettings()}
                      placeholder="비밀번호 입력"
                      className="w-full text-center rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 text-white"
                    />
                    <button
                      onClick={handleUnlockSettings}
                      className="w-full rounded-xl bg-zinc-800 py-3 text-xs font-bold text-white shadow hover:bg-zinc-900 transition border border-white/5"
                    >
                      잠금 해제
                    </button>
                  </div>
                </div>
              ) : (
                // Unlocked Settings content
                <>
                  {/* Unlock Notice Banner */}
                  <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-2 shadow-inner backdrop-blur-md">
                    <span className="text-[10px] text-zinc-300 font-bold flex items-center gap-1.5">
                      <Unlock className="h-3.5 w-3.5 text-emerald-400" /> 개인정보 잠금 해제됨
                    </span>
                    <button
                      onClick={() => {
                        setIsSettingsUnlocked(false);
                        setInputPasscode("");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-[10px] font-bold hover:bg-white/10 transition shadow-sm"
                    >
                      다시 잠그기
                    </button>
                  </div>

                  {/* Spotify config panel */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-lg backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-4">
                      <Music className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-sm font-bold text-zinc-200">Spotify 계정 연동</h3>
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
                          className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 py-3 text-xs text-zinc-355 placeholder-zinc-550 focus:outline-none focus:border-blue-500/50 text-white"
                        />
                      </div>

                      {spotifyToken ? (
                        <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/10 p-3.5 mt-1 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-455 font-semibold">연동 상태</span>
                            <span className="text-emerald-400 flex items-center gap-1 font-bold">
                              <Check className="h-3 w-3" /> 연동 완료
                            </span>
                          </div>
                          <div className="text-xs flex items-center justify-between text-zinc-455">
                            <span>사용자</span>
                            <span className="text-zinc-200 font-bold">{spotifyUser || '알 수 없음'}</span>
                          </div>
                          <button
                            onClick={() => setSpotifyToken(null, null, null)}
                            className="w-full mt-2 rounded-lg bg-zinc-900 border border-zinc-800 py-2.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
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
                            ※ 연동하지 않으면 미리 준비된 감성 음악 fallback 데이터베이스에서 추천 카드를 생성합니다. (Client ID는 Spotify Dashboard에 Redirect URI로 <code className="bg-black px-1 rounded text-zinc-400">{typeof window !== 'undefined' ? window.location.origin + '/' : 'http://localhost:3000/'}</code>를 등록해야 연결됩니다.)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gemini AI config panel */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-lg backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-indigo-400" />
                      <h3 className="text-sm font-bold text-zinc-200">Gemini AI 설정</h3>
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
                            className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3.5 py-3 text-xs text-zinc-850 placeholder-zinc-555 focus:outline-none focus:border-blue-500/50 text-white"
                          />
                          <button
                            onClick={() => {
                              setGeminiKey(tempGeminiKey);
                              alert("Gemini API 키가 저장되었습니다.");
                            }}
                            className="rounded-xl bg-blue-650 px-4 text-xs font-bold text-white hover:bg-blue-750 transition shadow-sm shadow-blue-600/10"
                          >
                            저장
                          </button>
                        </div>
                        {geminiKey ? (
                          <span className="inline-block mt-2 text-[10px] text-blue-400 font-bold">
                            ✓ API Key 활성화됨
                          </span>
                        ) : (
                          <span className="inline-block mt-2 text-[10px] text-yellow-500 font-bold flex items-center gap-1">
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
                                  ? "bg-blue-500/10 border-blue-500/50 text-blue-300"
                                  : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                              }`}
                            >
                              <div className="text-xs font-bold">{item.label}</div>
                              <div className="text-[10px] text-zinc-450 mt-1">{item.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Passcode Reset / Data settings */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-lg backdrop-blur-md">
                    <h3 className="text-xs font-bold text-zinc-455 mb-3">비밀번호 및 데이터 설정</h3>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          if (confirm("정말 개인정보 비밀번호를 초기화하시겠습니까? (연동 정보 등은 유지됩니다)")) {
                            setSettingsPasscode(null);
                            setIsSettingsUnlocked(false);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3.5 text-xs font-bold text-zinc-300 hover:bg-white/10 transition"
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
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-3.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
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

      {/* Floating Bottom Navigation Bar (Frosted dark glass reference styled) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-full px-5 py-3.5 flex justify-around items-center shadow-2xl">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "today" ? "text-blue-400" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Compass className="h-5 w-5" />
            <span className="text-[9px] font-bold tracking-wider">TODAY</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "history" ? "text-blue-400" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Archive className="h-5 w-5" />
            <span className="text-[9px] font-bold tracking-wider">HISTORY</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "settings" ? "text-blue-400" : "text-zinc-400 hover:text-white"
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
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
            {/* Modal backdrop closer */}
            <div className="absolute inset-0" onClick={() => !isGenerating && setIsSelectorOpen(false)}></div>

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md rounded-t-[32px] bg-[#0c0e14] border-t border-white/10 p-6 z-10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Close handler */}
              {!isGenerating && (
                <button
                  onClick={() => setIsSelectorOpen(false)}
                  className="absolute right-5 top-5 h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              <div className="flex items-center gap-2 mb-6">
                <Compass className="h-5 w-5 text-blue-500" />
                <h3 className="text-base font-bold text-zinc-200">현재의 소리 기록하기</h3>
              </div>

              {isGenerating ? (
                // Loading screen during generation
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative mb-6">
                    <div className="absolute -inset-1 rounded-full bg-blue-500/10 blur-xl"></div>
                    <Loader2 className="relative h-12 w-12 text-blue-500 animate-spin" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-200">음악 카드 제조 중...</h4>
                  <p className="text-xs text-zinc-500 mt-2 tracking-wide font-medium">{generationStep}</p>
                </div>
              ) : (
                // Step selections
                <div className="flex flex-col gap-5 pb-6">
                  {/* Category 1: Movement */}
                  <div>
                    <span className="block text-xs font-bold text-zinc-400 mb-2">1. 어디로 가고 있나요? (이동)</span>
                    <div className="flex flex-wrap gap-2">
                      {movementOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSelectedMovement(opt)}
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition font-semibold ${
                            selectedMovement === opt
                              ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md shadow-blue-600/10"
                              : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category 2: Activity */}
                  <div>
                    <span className="block text-xs font-bold text-zinc-400 mb-2">2. 무엇을 하고 있나요? (활동)</span>
                    <div className="flex flex-wrap gap-2">
                      {activityOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSelectedActivity(opt)}
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition font-semibold ${
                            selectedActivity === opt
                              ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md shadow-blue-600/10"
                              : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category 3: Weather */}
                  <div>
                    <span className="block text-xs font-bold text-zinc-400 mb-2">3. 바깥 날씨는 어떤가요? (날씨)</span>
                    <div className="flex flex-wrap gap-2">
                      {weatherOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSelectedWeather(opt)}
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition font-semibold ${
                            selectedWeather === opt
                              ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md shadow-blue-600/10"
                              : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category 4: Mood */}
                  <div>
                    <span className="block text-xs font-bold text-zinc-400 mb-2">4. 지금 마음은 어떤가요? (기분)</span>
                    <div className="flex flex-wrap gap-2">
                      {moodOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSelectedMood(opt)}
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition font-semibold ${
                            selectedMood === opt
                              ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md shadow-blue-600/10"
                              : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
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
                    className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-755 transition disabled:opacity-40 disabled:cursor-not-allowed mt-4 shadow-md shadow-blue-600/20"
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
