import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getMeetings } from "@/lib/notion-db";
import { notifyMeetingReminder } from "@/lib/discord";

export async function POST() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const meetings = await getMeetings();
    const now = new Date();
    let sent = 0;

    for (const m of meetings) {
      // 회의 시작 시간 계산 (KST 기준 저장이므로 그대로 사용)
      const meetingStart = new Date(`${m.date}T${m.startTime}:00+09:00`);
      const diffMs = meetingStart.getTime() - now.getTime();
      const diffMin = diffMs / (1000 * 60);

      // 55분~65분 전이면 알림 발송 (10분 윈도우)
      if (diffMin > 55 && diffMin < 65) {
        await notifyMeetingReminder(m.title, m.date, m.startTime, m.endTime, m.participants);
        sent++;
      }
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error("Reminder check failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
