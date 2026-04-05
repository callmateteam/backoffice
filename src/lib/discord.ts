import { getMemberName } from "@/lib/members";

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const MEETING_WEBHOOK_URL = process.env.DISCORD_MEETING_WEBHOOK_URL;

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
}

async function sendDiscord(embed: DiscordEmbed, webhookUrl?: string) {
  const url = webhookUrl || WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (e) {
    console.error("Discord webhook failed:", e);
  }
}

function formatKST(dateStr: string): { date: string; time: string } {
  try {
    const d = new Date(dateStr);
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const date = `${kst.getFullYear()}.${String(kst.getMonth() + 1).padStart(2, "0")}.${String(kst.getDate()).padStart(2, "0")}`;
    const time = `${String(kst.getHours()).padStart(2, "0")}:${String(kst.getMinutes()).padStart(2, "0")}`;
    return { date, time };
  } catch {
    const [datePart, timePart] = dateStr.split("T");
    return { date: datePart || dateStr, time: timePart?.substring(0, 5) || "" };
  }
}

function formatAssignees(assigneeStr: string): string {
  if (!assigneeStr) return "미지정";
  return assigneeStr
    .split(",")
    .filter(Boolean)
    .map((a) => getMemberName(a))
    .join(", ");
}

export async function notifyNewSchedule(title: string, assignee: string, startDate: string, endDate: string) {
  const start = formatKST(startDate);
  const end = formatKST(endDate);

  await sendDiscord({
    title: "📅 새 일정 등록",
    color: 0x4f46e5,
    fields: [
      { name: "제목", value: title },
      { name: "담당자", value: formatAssignees(assignee) },
      { name: "시작", value: `${start.date}  ${start.time}`, inline: true },
      { name: "종료", value: `${end.date}  ${end.time}`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

export async function notifyNewNotice(title: string, author: string) {
  await sendDiscord({
    title: "📢 새 공지사항",
    color: 0x8b5cf6,
    fields: [
      { name: "제목", value: title, inline: true },
      { name: "작성자", value: getMemberName(author), inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

export async function notifyNewTodo(scheduleTitle: string, todoTitle: string, assignee: string) {
  await sendDiscord({
    title: "✅ 새 할일 추가",
    color: 0x22c55e,
    fields: [
      { name: "일정", value: scheduleTitle, inline: true },
      { name: "할일", value: todoTitle, inline: true },
      { name: "담당자", value: assignee ? getMemberName(assignee) : "미지정" },
    ],
    timestamp: new Date().toISOString(),
  });
}

export async function notifyNewMeeting(title: string, date: string, startTime: string, endTime: string, participants: string) {
  await sendDiscord({
    title: "📅 새 회의 등록",
    color: 0x4f46e5,
    fields: [
      { name: "제목", value: title },
      { name: "날짜", value: date, inline: true },
      { name: "시간", value: `${startTime} ~ ${endTime}`, inline: true },
      { name: "참여자", value: formatAssignees(participants) },
    ],
    timestamp: new Date().toISOString(),
  }, MEETING_WEBHOOK_URL || undefined);
}

export async function notifyMeetingReminder(title: string, date: string, startTime: string, endTime: string, participants: string) {
  await sendDiscord({
    title: "🔔 회의 1시간 전 알림",
    color: 0xf59e0b,
    fields: [
      { name: "제목", value: title },
      { name: "날짜", value: date, inline: true },
      { name: "시간", value: `${startTime} ~ ${endTime}`, inline: true },
      { name: "참여자", value: formatAssignees(participants) },
    ],
    timestamp: new Date().toISOString(),
  }, MEETING_WEBHOOK_URL || undefined);
}

export async function notifyMeetingMinutes(title: string, author: string, siteUrl: string) {
  await sendDiscord({
    title: "📝 회의록 작성 완료",
    color: 0x22c55e,
    fields: [
      { name: "제목", value: title, inline: true },
      { name: "작성자", value: getMemberName(author), inline: true },
      { name: "확인", value: `[백오피스에서 확인하기](${siteUrl}/meetings)` },
    ],
    timestamp: new Date().toISOString(),
  }, MEETING_WEBHOOK_URL || undefined);
}

export async function notifyWorkLogReminder(siteUrl: string) {
  const webhookUrl = process.env.DISCORD_WORKLOG_WEBHOOK_URL;
  await sendDiscord({
    title: "📋 업무일지 작성 알림",
    description: "오늘 하루 업무 내용을 정리해주세요!",
    color: 0xf59e0b,
    fields: [
      { name: "작성하기", value: `[백오피스에서 작성하기](${siteUrl}/worklogs)` },
    ],
    timestamp: new Date().toISOString(),
  }, webhookUrl || undefined);
}

export async function notifyWorkLogWritten(date: string, author: string, summary: string) {
  const webhookUrl = process.env.DISCORD_WORKLOG_WEBHOOK_URL;
  await sendDiscord({
    title: `📝 업무일지 작성 — ${getMemberName(author)}`,
    color: 0x4f46e5,
    fields: [
      { name: "날짜", value: date, inline: true },
      { name: "작성자", value: getMemberName(author), inline: true },
      { name: "요약", value: summary || "(내용 없음)" },
    ],
    timestamp: new Date().toISOString(),
  }, webhookUrl || undefined);
}
