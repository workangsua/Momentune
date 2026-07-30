import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GLOBAL_DB_OBJECT_ID = "ff8081819f7e10ae019fb48a72e55002";

export async function GET() {
  try {
    const res = await fetch(`https://api.restful-api.dev/objects/${GLOBAL_DB_OBJECT_ID}`, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.data) {
        return NextResponse.json(data.data);
      }
    }
  } catch (err) {
    console.warn("Global DB GET warning:", err);
  }

  return NextResponse.json({ todayCards: [], historyCards: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { todayCards, historyCards } = body;
    const payload = {
      todayCards: todayCards || [],
      historyCards: historyCards || [],
      updatedAt: new Date().toISOString()
    };

    const res = await fetch(`https://api.restful-api.dev/objects/${GLOBAL_DB_OBJECT_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: "momentune_global_v1",
        data: payload
      })
    });

    if (res.ok) {
      return NextResponse.json({ success: true, payload });
    }
  } catch (err: any) {
    console.error("Global DB POST error:", err);
  }

  return NextResponse.json({ success: false });
}
