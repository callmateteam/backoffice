import { NextRequest, NextResponse } from "next/server";
import { generateDrafts } from "@/lib/threads";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateDrafts();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Threads generate failed:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
