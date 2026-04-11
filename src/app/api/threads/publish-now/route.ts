import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const THREADS_USER_ID = process.env.THREADS_USER_ID!;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN!;
const DISCORD_WEBHOOK = process.env.DISCORD_THREADS_WEBHOOK_URL || "";
const NOTION_API = "https://api.notion.com/v1";
const THREADS_API = "https://graph.threads.net/v1.0";

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pageId } = await request.json();
  if (!pageId) return NextResponse.json({ error: "pageId required" }, { status: 400 });

  const headers = {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };

  try {
    // 1. Get post content from Notion
    const pageRes = await fetch(`${NOTION_API}/pages/${pageId}`, { headers });
    if (!pageRes.ok) throw new Error("Page not found");
    const page = await pageRes.json();

    const content = page.properties["본문"]?.rich_text?.[0]?.plain_text ?? "";
    const title = page.properties["제목"]?.title?.[0]?.plain_text ?? "";
    const type = page.properties["유형"]?.select?.name ?? "";

    if (!content) throw new Error("No content");

    // 2. Update status to 발행중
    await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ properties: { 상태: { select: { name: "발행중" } } } }),
    });

    // 3. Create Threads container
    const createRes = await fetch(`${THREADS_API}/${THREADS_USER_ID}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "TEXT",
        text: content,
        access_token: THREADS_ACCESS_TOKEN,
      }),
    });
    if (!createRes.ok) throw new Error(await createRes.text());
    const { id: containerId } = await createRes.json();

    // 4. Publish
    const pubRes = await fetch(`${THREADS_API}/${THREADS_USER_ID}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: THREADS_ACCESS_TOKEN,
      }),
    });
    if (!pubRes.ok) throw new Error(await pubRes.text());
    const { id: postId } = await pubRes.json();

    // 5. Get permalink
    const linkRes = await fetch(
      `${THREADS_API}/${postId}?fields=permalink&access_token=${THREADS_ACCESS_TOKEN}`
    );
    let permalink = `threads-post-${postId}`;
    if (linkRes.ok) {
      const data = await linkRes.json();
      if (data.permalink) permalink = data.permalink;
    }

    // 6. Update Notion — 발행완료
    await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        properties: {
          상태: { select: { name: "발행완료" } },
          "Threads URL": { url: permalink },
        },
      }),
    });

    // 7. Discord 알림
    if (DISCORD_WEBHOOK) {
      await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "Threads 발행 완료",
            color: 0x00d166,
            fields: [
              { name: "유형", value: type, inline: true },
              { name: "글자수", value: `${content.length}자`, inline: true },
              { name: "본문", value: content.length > 200 ? content.slice(0, 200) + "..." : content },
              { name: "링크", value: permalink },
            ],
            timestamp: new Date().toISOString(),
          }],
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, permalink });
  } catch (error) {
    // 실패 시 상태 복구
    await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ properties: { 상태: { select: { name: "승인" } } } }),
    });
    console.error("Publish now failed:", error);
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}
