export interface SupabaseConfig {
  url: string;
  key: string;
}

export const getSupabaseConfig = (): SupabaseConfig | null => {
  if (typeof window === "undefined") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (url && key) return { url, key };
    return null;
  }

  const storedUrl = localStorage.getItem("momentune_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const storedKey = localStorage.getItem("momentune_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (storedUrl && storedKey) {
    return { url: storedUrl, key: storedKey };
  }
  return null;
};

// Save Supabase credentials to localStorage
export const setSupabaseCredentials = (url: string, key: string) => {
  if (typeof window === "undefined") return;
  if (url && key) {
    localStorage.setItem("momentune_supabase_url", url.trim());
    localStorage.setItem("momentune_supabase_key", key.trim());
  } else {
    localStorage.removeItem("momentune_supabase_url");
    localStorage.removeItem("momentune_supabase_key");
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
