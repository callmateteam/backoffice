import { NextRequest, NextResponse } from "next/server";

const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const THREADS_DB = process.env.NOTION_THREADS_DB!;
const THREADS_USER_ID = process.env.THREADS_USER_ID!;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN!;

const NOTION_API = "https://api.notion.com/v1";
const THREADS_API = "https://graph.threads.net/v1.0";

const notionHeaders = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28",
};

interface Insight {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
}

async function fetchPostInsights(postId: string): Promise<Insight | null> {
  const url = `${THREADS_API}/${postId}/insights?metric=views,likes,replies,reposts,quotes,shares&access_token=${THREADS_ACCESS_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const result: Insight = { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0, shares: 0 };
  for (const item of data.data || []) {
    const name = item.name;
    const value = item.values?.[0]?.value ?? 0;
    if (name in result) (result as any)[name] = value;
  }
  return result;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Threads not configured" }, { status: 500 });
  }

  try {
    // Get all published posts
    const queryRes = await fetch(`${NOTION_API}/databases/${THREADS_DB}/query`, {
      method: "POST",
      headers: notionHeaders,
      body: JSON.stringify({
        filter: { property: "상태", select: { equals: "발행완료" } },
      }),
    });
    const queryData = await queryRes.json();
    const published = queryData.results || [];

    // Get all Threads posts to match by permalink
    const postsRes = await fetch(
      `${THREADS_API}/${THREADS_USER_ID}/threads?fields=id,permalink&access_token=${THREADS_ACCESS_TOKEN}&limit=50`
    );
    if (!postsRes.ok) {
      return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
    const postsData = await postsRes.json();
    const threadsPosts = postsData.data || [];

    let updated = 0;
    for (const page of published) {
      const permalink = page.properties["Threads URL"]?.url;
      if (!permalink) continue;

      const threadsPost = threadsPosts.find((p: any) => p.permalink === permalink);
      if (!threadsPost) continue;

      const insights = await fetchPostInsights(threadsPost.id);
      if (!insights) continue;

      await fetch(`${NOTION_API}/pages/${page.id}`, {
        method: "PATCH",
        headers: notionHeaders,
        body: JSON.stringify({
          properties: {
            views: { number: insights.views },
            likes: { number: insights.likes },
            replyCount: { number: insights.replies },
            reposts: { number: insights.reposts },
            quotes: { number: insights.quotes },
            shares: { number: insights.shares },
          },
        }),
      });
      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Insights fetch failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
