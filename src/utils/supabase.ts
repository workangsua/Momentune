export interface SupabaseConfig {
  url: string;
  key: string;
}

export const getSupabaseConfig = (): SupabaseConfig | null => {
  if (typeof window === "undefined") {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, '');
    const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
    if (url && key) return { url, key };
    return null;
  }

  const storedUrl = (localStorage.getItem("momentune_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, '');
  const storedKey = (localStorage.getItem("momentune_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  if (storedUrl && storedKey) {
    return { url: storedUrl, key: storedKey };
  }
  return null;
};

// Test Supabase connection and return clear diagnostic status
export const testSupabaseConnection = async (inputUrl: string, inputKey: string): Promise<{ success: boolean; message: string }> => {
  const url = inputUrl.trim().replace(/\/+$/, '');
  const key = inputKey.trim();

  if (!url || !key) {
    return { success: false, message: "URL과 Anon Key를 모두 입력해 주세요." };
  }

  try {
    const res = await fetch(`${url}/rest/v1/music_cards?select=*&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      }
    });

    if (res.ok) {
      return { success: true, message: "✅ Supabase 데이터베이스 연결 성공! (music_cards 테이블 정상 작동 중)" };
    } else if (res.status === 404) {
      return { success: false, message: "⚠️ 404 Not Found: Supabase에 'music_cards' 테이블이 존재하지 않습니다. 밑의 SQL 스니펫을 Supabase SQL Editor에서 실행해 주세요." };
    } else if (res.status === 401 || res.status === 403) {
      return { success: false, message: "⚠️ 401/403 Permission Error: Anon Key가 틀렸거나 RLS 보안이 켜져 있습니다. SQL에서 'alter table music_cards disable row level security;' 명령어를 실행해 보세요." };
    } else {
      return { success: false, message: `⚠️ 오류 코드 ${res.status}: Supabase 응답 실패 (${res.statusText})` };
    }
  } catch (err: any) {
    return { success: false, message: `⚠️ 네트워크 연결 실패: ${err.message || 'Supabase URL을 다시 확인해 주세요.'}` };
  }
};

// Fetch cards from Supabase PostgreSQL table 'music_cards'
export const fetchCardsFromSupabase = async () => {
  const config = getSupabaseConfig();
  if (!config) return null;

  try {
    const res = await fetch(`${config.url}/rest/v1/music_cards?select=*&order=created_at.desc`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json"
      }
    });

    if (res.ok) {
      const rows = await res.json();
      return rows.map((r: any) => ({
        id: r.id,
        createdAt: r.created_at || r.createdAt,
        dateKey: r.date_key || r.dateKey,
        context: r.context,
        track: r.track,
        aiReason: r.ai_reason || r.aiReason
      }));
    }
  } catch (err) {
    console.warn("Supabase fetch warning:", err);
  }
  return null;
};

// Save a new music card to Supabase
export const insertCardToSupabase = async (card: any) => {
  const config = getSupabaseConfig();
  if (!config) return false;

  try {
    const res = await fetch(`${config.url}/rest/v1/music_cards`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        id: card.id,
        created_at: card.createdAt,
        date_key: card.dateKey,
        context: card.context,
        track: card.track,
        ai_reason: card.aiReason
      })
    });

    return res.ok;
  } catch (err) {
    console.warn("Supabase insert warning:", err);
  }
  return false;
};

// Delete a card from Supabase
export const deleteCardFromSupabase = async (cardId: string) => {
  const config = getSupabaseConfig();
  if (!config) return false;

  try {
    const res = await fetch(`${config.url}/rest/v1/music_cards?id=eq.${cardId}`, {
      method: "DELETE",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`
      }
    });

    return res.ok;
  } catch (err) {
    console.warn("Supabase delete warning:", err);
  }
  return false;
};
