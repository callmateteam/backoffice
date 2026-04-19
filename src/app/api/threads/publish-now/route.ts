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
    const comment = page.properties["댓글"]?.rich_text?.[0]?.plain_text ?? "";
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

    // 3.5 컨테이너 처리 상태 확인 (최대 30초 폴링)
    let status = "IN_PROGRESS";
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch(
        `${THREADS_API}/${containerId}?fields=status&access_token=${THREADS_ACCESS_TOKEN}`
      );
      if (statusRes.ok) {
        const s = await statusRes.json();
        status = s.status;
        if (status === "FINISHED") break;
        if (status === "ERROR" || status === "EXPIRED") {
          throw new Error(`Container status: ${status}`);
        }
      }
    }
    if (status !== "FINISHED") {
      throw new Error(`Container not ready after 30s. Status: ${status}`);
    }

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

    // 4.5 댓글(1번 스레드) 이어서 발행
    if (comment && comment.trim()) {
      try {
        const replyCreateRes = await fetch(`${THREADS_API}/${THREADS_USER_ID}/threads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "TEXT",
            text: comment.trim(),
            reply_to_id: postId,
            access_token: THREADS_ACCESS_TOKEN,
          }),
        });
        if (replyCreateRes.ok) {
          const { id: replyContainerId } = await replyCreateRes.json();
          // 컨테이너 폴링
          let rStatus = "IN_PROGRESS";
          for (let i = 0; i < 10; i++) {
            await new Promise((r) => setTimeout(r, 3000));
            const sRes = await fetch(
              `${THREADS_API}/${replyContainerId}?fields=status&access_token=${THREADS_ACCESS_TOKEN}`
            );
            if (sRes.ok) {
              const s = await sRes.json();
              rStatus = s.status;
              if (rStatus === "FINISHED") break;
              if (rStatus === "ERROR" || rStatus === "EXPIRED") break;
            }
          }
          if (rStatus === "FINISHED") {
            await fetch(`${THREADS_API}/${THREADS_USER_ID}/threads_publish`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creation_id: replyContainerId,
                access_token: THREADS_ACCESS_TOKEN,
              }),
            });
          }
        }
      } catch (err) {
        console.error("Comment publish failed:", err);
      }
    }

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
