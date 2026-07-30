import { NextResponse } from 'next/server';

// Serverless in-memory & cloud KV store sync route
const memoryStore: Record<string, any> = {};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') || 'default_user';

  try {
    // Try reading from global cloud KV store (kvdb.io)
    const kvRes = await fetch(`https://kvdb.io/momentune_cloud_v1/${encodeURIComponent(code)}`, {
      headers: { 'Cache-Control': 'no-cache' },
      cache: 'no-store'
    });
    if (kvRes.ok) {
      const data = await kvRes.json();
      memoryStore[code] = data;
      return NextResponse.json(data);
    }
  } catch (err) {
    console.warn("KV fetch fallback:", err);
  }

  // Fallback to server memory
  return NextResponse.json(memoryStore[code] || { todayCards: [], historyCards: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, todayCards, historyCards } = body;
    const syncCode = code || 'default_user';
    const payload = { todayCards: todayCards || [], historyCards: historyCards || [], updatedAt: new Date().toISOString() };

    memoryStore[syncCode] = payload;

    // Push to global cloud KV store
    await fetch(`https://kvdb.io/momentune_cloud_v1/${encodeURIComponent(syncCode)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return NextResponse.json({ success: true, payload });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
