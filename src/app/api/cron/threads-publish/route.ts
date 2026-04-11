import { NextRequest, NextResponse } from "next/server";
import { publishApproved } from "@/lib/threads";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await publishApproved();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Threads publish failed:", error);
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}
