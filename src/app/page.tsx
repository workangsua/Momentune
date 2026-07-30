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
  Play,
  RotateCcw
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
    isHydrated,
    setActiveTab,
    addCard,
    deleteCard,
    setSpotifyClientId,
    setSpotifyToken,
    setGeminiKey,
    setAiPersona,
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

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#030303] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="text-sm font-medium tracking-wide">모멘튠 조율 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center pb-28 pt-8">
      {/* Header Logo */}
      <header className="mb-8 flex flex-col items-center text-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Music className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-wider text-gradient">MOMENTUNE</h1>
        </motion.div>
        <p className="text-xs text-zinc-500 mt-1">당일의 순간을 기록하는 AI 맥락 음악 카드</p>
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
                <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4">
                  <div className="relative mb-6">
                    <div className="absolute -inset-1 rounded-full bg-indigo-500/20 blur-xl"></div>
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-indigo-500/30 bg-[#09090b]">
                      <Compass className="h-10 w-10 text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-zinc-200">지금 이 순간의 음악</h2>
                  <p className="text-sm text-zinc-400 mt-2 max-w-xs leading-relaxed">
                    이동, 활동, 날씨, 기분을 기록하고<br />
                    AI가 추천하는 감성 음악 카드를 생성해 보세요.
                  </p>
                  
                  <button
                    onClick={() => setIsSelectorOpen(true)}
                    className="mt-8 flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-indigo-700 transition duration-300"
                  >
                    <Plus className="h-4 w-4" />
                    내 상태 기록하고 음악 카드 받기
                  </button>
                </div>
              ) : (
                // Timeline of today's cards
                <div className="flex flex-col gap-6">
                  {/* Floating CTA */}
                  <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-4 mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-300">오늘 쌓은 카드</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">자정에 자동으로 기록 보관함으로 이동합니다.</p>
                    </div>
                    <button
                      onClick={() => setIsSelectorOpen(true)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white shadow hover:bg-indigo-600 transition"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Cards list */}
                  <div className="flex flex-col gap-8 relative border-l border-zinc-800 ml-4 pl-6">
                    {todayCards.map((card, idx) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                      >
                        {/* Timeline Bullet */}
                        <div className="absolute -left-[31px] top-4 h-3.5 w-3.5 rounded-full border border-zinc-700 bg-zinc-950 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>
                        </div>

                        {/* Card Wrapper */}
                        <div className="glass-panel rounded-3xl p-5 relative overflow-hidden transition hover:border-zinc-700/60 shadow-xl">
                          {/* Top row: tags and delete */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(card.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              onClick={() => deleteCard(card.id, false)}
                              className="text-zinc-600 hover:text-red-400 transition p-1 rounded"
                              title="카드 삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Chips Container */}
                          <div className="flex flex-wrap gap-1.5 mb-5">
                            {Object.values(card.context).map((tag, tIdx) => tag && (
                              <span
                                key={tIdx}
                                className="inline-block rounded-full bg-white/5 border border-white/5 px-2.5 py-0.5 text-[10px] text-zinc-400 font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Vinyl Record & Track details */}
                          <div className="flex items-center gap-4 bg-black/25 rounded-2xl p-3 border border-white/5 mb-5">
                            {/* Spinning Vinyl Record Mock */}
                            <a
                              href={card.track.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative h-16 w-16 flex-shrink-0 cursor-pointer group/vinyl"
                              title="스포티파이에서 재생"
                            >
                              {/* Vinyl grooves */}
                              <div className="absolute inset-0 rounded-full bg-[#111] border border-zinc-800 shadow-md record-spin flex items-center justify-center">
                                <div className="h-12 w-12 rounded-full border border-zinc-900 bg-[#1e1e1e] flex items-center justify-center">
                                  {/* Center core */}
                                  <div className="h-4 w-4 rounded-full bg-[#111] border-2 border-zinc-700 flex items-center justify-center">
                                    <div className="h-1 w-1 rounded-full bg-white"></div>
                                  </div>
                                </div>
                              </div>
                              {/* Album cover clipped at center */}
                              <img
                                src={card.track.albumCover}
                                alt="Cover"
                                className="absolute inset-2 h-12 w-12 rounded-full object-cover record-spin shadow-inner border border-black/40 group-hover/vinyl:scale-105 transition duration-300"
                              />
                              {/* Hover play icon overlay */}
                              <div className="absolute inset-2 h-12 w-12 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/vinyl:opacity-100 transition duration-300">
                                <Play className="h-4 w-4 text-white fill-white" />
                              </div>
                            </a>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-zinc-200 truncate">{card.track.title}</h4>
                              <p className="text-xs text-zinc-400 truncate mt-0.5">{card.track.artist}</p>
                              
                              <a
                                href={card.track.spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-2 hover:underline"
                              >
                                Spotify에서 듣기 <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          </div>

                          {/* AI Recommendation Reason */}
                          <div className="relative bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/10">
                            <Sparkles className="absolute right-3.5 top-3.5 h-4 w-4 text-indigo-400/30" />
                            <p className="text-xs text-zinc-300 leading-relaxed font-medium whitespace-pre-line">
                              {card.aiReason}
                            </p>
                          </div>
                        </div>
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
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
                  <Archive className="h-10 w-10 text-zinc-600 mb-4" />
                  <h2 className="text-lg font-bold text-zinc-300">보관된 기록 없음</h2>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                    오늘이 지나 자정이 되면,<br />
                    작성된 카드들이 자동으로 날짜별 보관함에 들어옵니다.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Filter bar */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <h3 className="text-xs font-semibold text-zinc-400 mb-3">태그별 필터링</h3>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      <button
                        onClick={() => setHistoryFilterTag("")}
                        className={`rounded-full px-3 py-1 text-xs transition ${
                          !historyFilterTag
                            ? "bg-indigo-600 text-white font-medium shadow"
                            : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
                        }`}
                      >
                        전체
                      </button>
                      {getHistoryTags().map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setHistoryFilterTag(tag)}
                          className={`rounded-full px-3 py-1 text-xs transition ${
                            historyFilterTag === tag
                              ? "bg-indigo-600 text-white font-medium shadow"
                              : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grouped lists */}
                  <div className="flex flex-col gap-8">
                    {Object.entries(getGroupedHistory()).map(([date, cards]) => (
                      <div key={date} className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                          <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="text-xs font-bold tracking-wide text-zinc-300 font-mono">{date}</span>
                          <span className="text-[10px] text-zinc-500">({cards.length}곡)</span>
                        </div>

                        <div className="flex flex-col gap-4">
                          {cards.map((card) => (
                            <div
                              key={card.id}
                              className="glass-panel rounded-2xl p-4 border border-zinc-800/40 relative shadow-md"
                            >
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div>
                                  <h4 className="text-sm font-bold text-zinc-200">{card.track.title}</h4>
                                  <p className="text-xs text-zinc-400">{card.track.artist}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={card.track.spotifyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition"
                                    title="Spotify에서 열기"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                  <button
                                    onClick={() => deleteCard(card.id, true)}
                                    className="p-1 rounded bg-zinc-800/50 hover:bg-zinc-850 text-zinc-400 hover:text-red-400 transition"
                                    title="삭제"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1 mb-3">
                                {Object.values(card.context).map((tag, tIdx) => tag && (
                                  <span
                                    key={tIdx}
                                    className="rounded bg-white/5 px-2 py-0.5 text-[9px] text-zinc-400 border border-white/5"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>

                              <div className="bg-zinc-950/40 rounded-xl p-3 border border-white/5">
                                <p className="text-xs text-zinc-400 leading-relaxed italic whitespace-pre-line">
                                  {card.aiReason}
                                </p>
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
              {/* Spotify PKCE config */}
              <div className="glass-panel rounded-3xl p-5 shadow-lg border border-zinc-800/50">
                <div className="flex items-center gap-2 mb-4">
                  <Music className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-zinc-200">Spotify 계정 연동</h3>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Spotify Client ID
                    </label>
                    <input
                      type="text"
                      value={tempClientId}
                      onChange={(e) => setTempClientId(e.target.value)}
                      placeholder="Spotify Developer Client ID"
                      className="w-full rounded-xl bg-black/40 border border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  {spotifyToken ? (
                    <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/10 p-3 mt-1 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-medium">연동 상태</span>
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="h-3 w-3" /> 연동 완료
                        </span>
                      </div>
                      <div className="text-xs flex items-center justify-between text-zinc-400">
                        <span>사용자</span>
                        <span className="text-zinc-200 font-semibold">{spotifyUser || '알 수 없음'}</span>
                      </div>
                      <button
                        onClick={() => setSpotifyToken(null, null, null)}
                        className="w-full mt-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 py-2 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
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
                        className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-white shadow-md shadow-emerald-500/10 hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Spotify 로그인 연동
                      </button>
                      <p className="text-[10px] text-zinc-500 leading-normal px-1">
                        ※ 연동하지 않으면 미리 준비된 감성 음악 fallback 데이터베이스에서 추천 카드를 생성합니다. (Client ID는 Spotify Dashboard에 Redirect URI로 <code className="bg-black px-1 rounded text-zinc-300">{typeof window !== 'undefined' ? window.location.origin + '/' : 'http://localhost:3000/'}</code>를 등록해야 연결됩니다.)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Gemini AI key config */}
              <div className="glass-panel rounded-3xl p-5 shadow-lg border border-zinc-800/50">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-zinc-200">Gemini AI 설정</h3>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Gemini API Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={tempGeminiKey}
                        onChange={(e) => setTempGeminiKey(e.target.value)}
                        placeholder="Google Gemini API Key 입력"
                        className="flex-1 rounded-xl bg-black/40 border border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                      />
                      <button
                        onClick={() => {
                          setGeminiKey(tempGeminiKey);
                          alert("Gemini API 키가 저장되었습니다.");
                        }}
                        className="rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                      >
                        저장
                      </button>
                    </div>
                    {geminiKey ? (
                      <span className="inline-block mt-2 text-[10px] text-indigo-400 font-medium">
                        ✓ API Key 활성화됨
                      </span>
                    ) : (
                      <span className="inline-block mt-2 text-[10px] text-yellow-500 font-medium flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> 키 미입력 상태 (테스트 데모 큐레이션 제공)
                      </span>
                    )}
                  </div>

                  {/* Persona Tuning */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2">
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
                              ? "bg-indigo-600/10 border-indigo-500/70 text-indigo-300 shadow"
                              : "bg-black/20 border-zinc-800 text-zinc-400 hover:bg-black/40"
                          }`}
                        >
                          <div className="text-xs font-bold">{item.label}</div>
                          <div className="text-[10px] text-zinc-500 mt-1">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data management options */}
              <div className="glass-panel rounded-3xl p-5 shadow-lg border border-zinc-800/50">
                <h3 className="text-xs font-bold text-zinc-400 mb-3">데이터 관리</h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (confirm("정말 전체 역사 기록 카드를 삭제하시겠습니까?")) {
                        clearHistory();
                        alert("히스토리가 초기화되었습니다.");
                      }
                    }}
                    disabled={historyCards.length === 0}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 py-3.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    기록 탭 보관소 완전히 비우기
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Bottom Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
        <div className="glass-panel glass-panel-glow rounded-full px-5 py-3.5 flex justify-around items-center border border-white/10 shadow-2xl">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "today" ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-400"
            }`}
          >
            <Compass className="h-5 w-5" />
            <span className="text-[9px] font-semibold tracking-wider">TODAY</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "history" ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-400"
            }`}
          >
            <Archive className="h-5 w-5" />
            <span className="text-[9px] font-semibold tracking-wider">HISTORY</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "settings" ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-400"
            }`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span className="text-[9px] font-semibold tracking-wider">SETTINGS</span>
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
              className="relative w-full max-w-md rounded-t-[32px] bg-[#0c0c0e] border-t border-zinc-800 p-6 z-10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Close handler */}
              {!isGenerating && (
                <button
                  onClick={() => setIsSelectorOpen(false)}
                  className="absolute right-5 top-5 h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              <div className="flex items-center gap-2 mb-6">
                <Compass className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-zinc-200">현재의 소리 기록하기</h3>
              </div>

              {isGenerating ? (
                // Loading screen during generation
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative mb-6">
                    <div className="absolute -inset-1 rounded-full bg-indigo-500/20 blur-xl"></div>
                    <Loader2 className="relative h-12 w-12 text-indigo-400 animate-spin" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-300">음악 카드 제조 중...</h4>
                  <p className="text-xs text-zinc-500 mt-2 tracking-wide">{generationStep}</p>
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
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition ${
                            selectedMovement === opt
                              ? "bg-indigo-600/10 border-indigo-500/70 text-indigo-300 font-semibold"
                              : "bg-black/20 border-zinc-800 text-zinc-400 hover:bg-black/40"
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
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition ${
                            selectedActivity === opt
                              ? "bg-indigo-600/10 border-indigo-500/70 text-indigo-300 font-semibold"
                              : "bg-black/20 border-zinc-800 text-zinc-400 hover:bg-black/40"
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
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition ${
                            selectedWeather === opt
                              ? "bg-indigo-600/10 border-indigo-500/70 text-indigo-300 font-semibold"
                              : "bg-black/20 border-zinc-800 text-zinc-400 hover:bg-black/40"
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
                          className={`rounded-xl border px-3.5 py-2.5 text-xs transition ${
                            selectedMood === opt
                              ? "bg-indigo-600/10 border-indigo-500/70 text-indigo-300 font-semibold"
                              : "bg-black/20 border-zinc-800 text-zinc-400 hover:bg-black/40"
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
                    className="w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed mt-4 shadow-lg shadow-indigo-600/25"
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
