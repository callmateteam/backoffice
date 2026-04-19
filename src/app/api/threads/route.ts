import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const THREADS_DB = process.env.NOTION_THREADS_DB!;
const NOTION_API = "https://api.notion.com/v1";
const headers = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28",
};

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(`${NOTION_API}/databases/${THREADS_DB}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: 500 });
  const data = await res.json();

  const posts = data.results.map((page: any) => {
    const p = page.properties;
    return {
      id: page.id,
      title: p["제목"]?.title?.[0]?.plain_text ?? "",
      content: p["본문"]?.rich_text?.[0]?.plain_text ?? "",
      comment: p["댓글"]?.rich_text?.[0]?.plain_text ?? "",
      type: p["유형"]?.select?.name ?? "",
      status: p["상태"]?.select?.name ?? "",
      scheduledAt: p["예약시간"]?.date?.start ?? null,
      threadsUrl: p["Threads URL"]?.url ?? null,
      createdAt: page.created_time,
      views: p["views"]?.number ?? 0,
      likes: p["likes"]?.number ?? 0,
      replyCount: p["replyCount"]?.number ?? 0,
      reposts: p["reposts"]?.number ?? 0,
      quotes: p["quotes"]?.number ?? 0,
      shares: p["shares"]?.number ?? 0,
    };
  });

  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { database_id: THREADS_DB },
      properties: {
        제목: { title: [{ text: { content: body.title || "" } }] },
        본문: { rich_text: [{ text: { content: body.content || "" } }] },
        댓글: { rich_text: [{ text: { content: body.comment || "" } }] },
        유형: { select: { name: body.type || "공감형" } },
        상태: { select: { name: "초안" } },
      },
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: 500 });
  const result = await res.json();
  return NextResponse.json({ id: result.id }, { status: 201 });
}
