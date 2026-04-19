import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const NOTION_API = "https://api.notion.com/v1";
const headers = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const properties: any = {};
  if (body.status) properties["상태"] = { select: { name: body.status } };
  if (body.content) properties["본문"] = { rich_text: [{ text: { content: body.content } }] };
  if (body.comment !== undefined) properties["댓글"] = { rich_text: [{ text: { content: body.comment } }] };
  if (body.scheduledAt) properties["예약시간"] = { date: { start: body.scheduledAt } };

  const res = await fetch(`${NOTION_API}/pages/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Notion은 진짜 삭제(destroy) API가 없음 — archive가 DB에서 완전히 빠지게 만듦
  const res = await fetch(`${NOTION_API}/pages/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ in_trash: true, archived: true }),
  });

  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
