import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

const THREADS_API = "https://graph.threads.net/v1.0";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = request.nextUrl.searchParams.get("q") || "소상공인";
  const userId = process.env.THREADS_USER_ID;
  const accessToken = process.env.THREADS_ACCESS_TOKEN;

  if (!userId || !accessToken) {
    return NextResponse.json({ error: "Threads credentials not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${THREADS_API}/${userId}/threads_search?q=${encodeURIComponent(query)}&fields=id,text,username,timestamp,permalink&access_token=${accessToken}`
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Threads search failed:", err);
      return NextResponse.json({ error: "Search failed", detail: err }, { status: res.status });
    }

    const data = await res.json();
    const posts = (data.data || []).map((p: any) => ({
      id: p.id,
      text: p.text || "",
      username: p.username || "",
      timestamp: p.timestamp || "",
      permalink: p.permalink || "",
    }));

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Monitor search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
