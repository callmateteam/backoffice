import { getMemberName } from "@/lib/members";

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
}

async function sendDiscord(embed: DiscordEmbed) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
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
    // UTC → KST (+9)
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const date = `${kst.getFullYear()}.${String(kst.getMonth() + 1).padStart(2, "0")}.${String(kst.getDate()).padStart(2, "0")}`;
    const time = `${String(kst.getHours()).padStart(2, "0")}:${String(kst.getMinutes()).padStart(2, "0")}`;
    return { date, time };
  } catch {
    // dateStr이 이미 로컬 시간 형식일 경우
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
