import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

const THREADS_API = "https://graph.threads.net/v1.0";

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = process.env.THREADS_USER_ID;
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (!userId || !accessToken) {
    return NextResponse.json({ error: "Threads credentials not configured" }, { status: 500 });
  }

  try {
    const { replyToId, text } = await request.json();
    if (!replyToId || !text) {
      return NextResponse.json({ error: "replyToId and text required" }, { status: 400 });
    }

    // 1. Create reply container
    const createRes = await fetch(`${THREADS_API}/${userId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "TEXT",
        text,
        reply_to_id: replyToId,
        access_token: accessToken,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Container creation failed: ${err}`);
    }
    const { id: containerId } = await createRes.json();

    // 2. Publish reply
    const pubRes = await fetch(`${THREADS_API}/${userId}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    });

    if (!pubRes.ok) {
      const err = await pubRes.text();
      throw new Error(`Publish failed: ${err}`);
    }
    const { id: replyId } = await pubRes.json();

    // 3. Discord 알림
    const webhook = process.env.DISCORD_THREADS_WEBHOOK_URL;
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "💬 Threads 댓글 발행",
            color: 0x22c55e,
            fields: [
              { name: "댓글 내용", value: text.length > 300 ? text.slice(0, 300) + "..." : text },
            ],
            timestamp: new Date().toISOString(),
          }],
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, replyId });
  } catch (error) {
    console.error("Send reply failed:", error);
    return NextResponse.json({ error: "Reply failed" }, { status: 500 });
  }
}
