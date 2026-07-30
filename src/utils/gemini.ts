import { AIPersona } from '../types';

// Curated local offline AI reason templates based on persona & tags (in case no API key is provided)
const FALLBACK_REASONS: Record<AIPersona, string[]> = {
  witty: [
    "비가 오는데 운동이라니, 영혼까지 젖은 이 시점에 어울리는 비트입니다. 땀인지 빗물인지 아무도 모를 테니 더 세차게 달려보세요! ☔️🏃",
    "아침 출근길, 멍한 뇌세포들을 흔들어 깨워줄 노동요 대령입니다. 오늘 부장님 한마디에도 가볍게 댄스 스텝으로 흘려보내 볼까요? 💼💃",
    "드라이브 중 이 노래가 나온다면 엑셀러레이터를 조금 덜 밟도록 조심하세요. 속도위반 딱지 대신 심장 어택 주의보가 울릴 테니까요! 🚗🔥",
    "침대와 하나가 된 휴식 상태... 이 노래와 함께라면 당신은 한층 더 고차원적인 '완벽한 멍때림'을 완성하게 됩니다. 🛌✨",
    "집안일하면서 듣기에 너무 치명적인 멜로디군요. 고무장갑 끼고 마이크 삼아 열창하기 딱 좋습니다! 🧽🎤"
  ],
  emotional: [
    "습기 가득한 공기와 흘러내리는 빗물 틈새로, 차분하게 스며드는 선율입니다. 익숙한 풍경도 어딘가 영화 속 스틸컷처럼 아련하게 채워주네요. 🌧️🎻",
    "바쁘게 흘러가는 출근길, 발걸음 틈새로 가만히 마음을 녹여줄 노래입니다. 오늘 하루도 수많은 소음 속에 당신만의 템포를 지켜내길. ☕️🍃",
    "조용히 노을이 내려앉는 퇴근길, 지친 하루의 어깨를 툭툭 다독여주는 위로의 가사가 마음 깊은 곳에 가만히 남습니다. 🌇💫",
    "아무 생각 없이 휴식을 취하는 시간, 마음의 결을 부드럽게 정돈해 주는 멜로디와 함께 깊어지는 밤을 오롯이 누려보세요. 🌙🌌",
    "공기가 서늘해지는 시간, 산책길에 듣는 이 멜로디는 발바닥 밑에서부터 피어오르는 몽환적인 해방감을 선물합니다. 숲길을 걷는 듯한 온기. 🌲👣"
  ],
  direct: [
    "피곤함이 몰려오는데 누워만 있을 건가요? 당장 이 트랙의 에너지를 들이켜고 흐트러진 텐션을 끌어올려 보세요. ⏰⚡️",
    "잡생각 가득할 땐 이 단순하고 묵직한 베이스 라인이 정답입니다. 고민은 끄고, 소리 키우고, 그냥 음악에 머리를 비워두세요. 🧠🎧",
    "비 오는 흐린 날엔 굳이 억지로 텐션을 올리지 마세요. 축축한 분위기에 완벽히 어울리는 이 우울한 코드가 현실 도피를 돕습니다. 🌧️🚪",
    "산책하면서 귀를 틀어막기에 이만한 몰입감을 가진 곡도 드뭅니다. 주변 소음은 전부 음소거하고, 음악에만 초집중해서 걸으세요. 🚶🔌",
    "할 일이 태산인데 멍하니 있다면 이 드럼 비트가 엔진을 켜줄 겁니다. 5초 뒤에 즉시 시작하는 겁니다. 움직이세요. 🚀✊"
  ],
  tpo: [
    "오전 8시 30분, 출근과 동시에 소모되는 에너지를 완충해 줄 속도감 넘치는 템포의 트랙입니다. 오늘의 오프닝 브금으로 제격이네요. 🏁🔋",
    "나른해지는 오후 3시, 집중력이 흩어지는 공부 시간에 뇌에 시원한 스파클링 워터를 뿌려주듯 청량하게 채워주는 소리입니다. 🧊📝",
    "비 내리는 저녁 7시, 꿉꿉함을 잊게 할 재즈풍 사운드와 함께 오늘 고생한 당신을 위해 따스하게 내린 차 한 잔을 곁들여보세요. 🍵🎷",
    "주말 오후, 맑은 날 드라이브 코스에 완벽하게 녹아드는 상쾌한 어쿠스틱 사운드로 차 안을 가득 메워 보세요. ☀️🚙",
    "늦은 밤 11시, 몽환적인 조명 아래 조용히 침대 끝에 앉아 하루를 정리하는 고독과 휴식에 최적화된 리버브 풍부한 앰비언트 사운드입니다. 🕯️🌌"
  ]
};

// Diagnostic test for Gemini API Connection with detailed error reporting
export const testGeminiConnection = async (apiKey?: string | null): Promise<{ success: boolean; message: string }> => {
  const geminiKey =
    apiKey ||
    (typeof window !== 'undefined' ? localStorage.getItem('momentune_gemini_key') : null) ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!geminiKey || !geminiKey.trim()) {
    return { success: false, message: "Gemini API Key가 입력되지 않았습니다. 설정 탭의 Gemini API Key에 키를 입력하고 [저장]을 눌러주세요." };
  }

  const cleanKey = geminiKey.trim();
  const models = ["gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-pro"];
  let lastError = "";

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello" }] }],
            generationConfig: { maxOutputTokens: 15 }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { success: true, message: `✅ Gemini AI 실시간 연결 성공! (${model} 모델 반응 확인)` };
        }
      } else {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || response.statusText;
        lastError = `[${response.status}] ${errMsg}`;
        console.warn(`Gemini model ${model} error:`, lastError);
      }
    } catch (e: any) {
      lastError = e?.message || "네트워크 오류";
    }
  }

  return { success: false, message: `❌ Gemini API 호출 실패: ${lastError}` };
};

// Generate AI Reason via Gemini API or Fallback Templates
export const generateAIReason = async (
  context: { movement: string; activity: string; weather: string; mood: string },
  track: { title: string; artist: string },
  persona: AIPersona = 'emotional',
  apiKey?: string | null
): Promise<string> => {
  const rawKey =
    apiKey ||
    (typeof window !== 'undefined' ? localStorage.getItem('momentune_gemini_key') : null) ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY;

  const geminiKey = rawKey ? rawKey.trim() : null;

  const contextTags = [
    context.movement && `이동: ${context.movement}`,
    context.activity && `활동: ${context.activity}`,
    context.weather && `날씨: ${context.weather}`,
    context.mood && `기분: ${context.mood}`
  ].filter(Boolean).join(', ');

  const currentTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  // If no Gemini API Key is configured, use local fallback logic
  if (!geminiKey) {
    const list = FALLBACK_REASONS[persona] || FALLBACK_REASONS.emotional;
    const seed = (context.mood.charCodeAt(0) || 0) + (context.activity.charCodeAt(0) || 0);
    const index = seed % list.length;
    return list[index];
  }

  // Persona instructions
  const personaInstructions: Record<AIPersona, string> = {
    witty: "위트 있고 재치 있으며 유머러스한 느낌으로, 유저의 고개를 끄덕이게 하거나 풋 웃게 만드는 감성 톤앤매너",
    emotional: "마음을 차분하게 가라앉히거나 시적이고 아련한 표현을 섞은, 서정적이고 감성 깊은 위로의 톤앤매너",
    direct: "돌려 말하지 않고 팩트 폭격을 날리거나 아주 솔직하고 직설적인 행동 촉구형 잔소리 톤앤매너",
    tpo: "현재 시각과 날씨, 활동 등 유저의 구체적인 TPO 상황을 콕 집어서 '왜 지금 이 시간, 이 날씨에 이 노래인가'를 인과관계 위주로 납득시키는 톤앤매너"
  };

  const prompt = `
당신은 스포티파이 맥락 기반 음악 추천 앱 '모멘튠 (Momentune)'의 고도화된 AI 음악 큐레이터입니다.
유저의 현재 상황과 곡 정보에 맞춰 "오늘 이 순간 이 노래를 꼭 들어야 하는 이유"를 자연스럽고 친근한 한국어로 2~3줄 생성해 주세요.

[유저 정보]
- 상황 태그: ${contextTags}
- 현재 시간: ${currentTime}
- 곡 제목: ${track.title}
- 아티스트: ${track.artist}

[출력 페르소나 스타일]
- 페르소나 이름: ${persona.toUpperCase()}
- 지침: ${personaInstructions[persona]}

[중요 요청 사항 - 음악 및 가사 연결]
1. 추천하는 곡의 **음악적 템포/비트/빠르기**를 고려해 주세요. (예: 피곤할 때 빠른 템포면 기운을 돋아주고, 우울할 때 느린 템포면 감정을 흘려보내는 등)
2. 특히 이 곡의 **가사(Lyrics)가 가진 메시지, 감정선, 핵심 가사 구절**을 파악하여, 유저의 상황(이동, 활동, 날씨, 기분)과 연결해 '왜 지금 들어야 하는지' 설명해 주세요. (가사 관련 묘사를 구체적으로 녹이면 더욱 좋습니다.)

[작성 규칙]
1. 2줄에서 최대 3줄로 작성해 주세요. 줄바꿈을 적절히 섞어 가독성을 높여주세요.
2. 반말 또는 친근한 해요체를 섞어서 어색하지 않게 작성해 주세요.
3. 곡의 분위기와 유저 상황을 묘사하는 위트나 감성 키워드를 풍부하게 사용하되, 무의미한 미사여구는 빼세요.
4. 마크다운 기호(예: **, ##)는 절대 사용하지 마세요. 완성된 본문 문구만 바로 출력하세요.
`;

  // Official Gemini API endpoints to try in sequence
  const models = ["gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-pro"];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              maxOutputTokens: 200,
              temperature: 0.75
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (resultText) {
          return resultText.trim();
        }
      }
    } catch (error) {
      console.warn(`Gemini API call with ${model} failed:`, error);
    }
  }

  // Fallback if all API calls fail
  const list = FALLBACK_REASONS[persona] || FALLBACK_REASONS.emotional;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
};
