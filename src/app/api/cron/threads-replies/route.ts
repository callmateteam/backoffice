import { NextRequest, NextResponse } from "next/server";
import { collectReplies, syncThreadsPosts } from "@/lib/threads";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Sync manual posts first, then collect replies
    const syncResult = await syncThreadsPosts();
    const repliesResult = await collectReplies();
    return NextResponse.json({
      success: true,
      synced: syncResult.synced,
      collected: repliesResult.collected,
    });
  } catch (error) {
    console.error("Threads replies failed:", error);
    return NextResponse.json({ error: "Replies collection failed" }, { status: 500 });
  }
}
