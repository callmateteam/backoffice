import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getWorkLogs, appendWorkLog } from "@/lib/google-sheets";
import { WorkLog } from "@/types/worklog";
import { v4 as uuidv4 } from "uuid";
import { notifyWorkLogWritten } from "@/lib/discord";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await getWorkLogs(session.accessToken);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch worklogs:", error);
    return NextResponse.json({ error: "Failed to fetch worklogs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const log: WorkLog = {
      id: uuidv4(),
      date: body.date,
      author: session.user?.email || "",
      content: body.content,
      createdAt: new Date().toISOString(),
    };

    await appendWorkLog(session.accessToken, log);

    // Discord 알림: 요약 2줄
    const lines = log.content.split("\n").filter((l) => l.trim()).slice(0, 2).join(". ");
    notifyWorkLogWritten(log.date, log.author, lines);

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Failed to create worklog:", error);
    return NextResponse.json({ error: "Failed to create worklog" }, { status: 500 });
  }
}
