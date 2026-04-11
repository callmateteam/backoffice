import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const REPLIES_DB = process.env.NOTION_REPLIES_DB!;
const NOTION_API = "https://api.notion.com/v1";
const headers = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28",
};

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(`${NOTION_API}/databases/${REPLIES_DB}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: 500 });
  const data = await res.json();

  const replies = data.results.map((page: any) => {
    const p = page.properties;
    return {
      id: page.id,
      content: p["댓글내용"]?.rich_text?.[0]?.plain_text ?? "",
      username: p["작성자"]?.rich_text?.[0]?.plain_text ?? "",
      timestamp: p["작성시간"]?.date?.start ?? "",
      originalPost: p["원본글"]?.rich_text?.[0]?.plain_text ?? "",
      originalUrl: p["원본 URL"]?.url ?? null,
      createdAt: page.created_time,
      draftReply: p["draftReply"]?.rich_text?.[0]?.plain_text ?? "",
      draftStatus: p["draftStatus"]?.select?.name ?? "",
      replyId: p["Reply ID"]?.rich_text?.[0]?.plain_text ?? "",
    };
  });

  return NextResponse.json(replies);
}
