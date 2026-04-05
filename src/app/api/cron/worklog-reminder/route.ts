import { NextRequest, NextResponse } from "next/server";
import { notifyWorkLogReminder } from "@/lib/discord";

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const siteUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    await notifyWorkLogReminder(siteUrl);
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Worklog reminder failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
