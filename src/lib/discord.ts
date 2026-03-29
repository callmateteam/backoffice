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

export async function notifyNewSchedule(title: string, assignee: string, startDate: string, endDate: string) {
  await sendDiscord({
    title: "📅 새 일정 등록",
    color: 0x4f46e5,
    fields: [
      { name: "제목", value: title, inline: true },
      { name: "담당자", value: assignee || "미지정", inline: true },
      { name: "기간", value: `${startDate} ~ ${endDate}` },
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
      { name: "작성자", value: author, inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}
