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

  const res = await fetch(`${NOTION_API}/pages/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ archived: true }),
  });

  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
