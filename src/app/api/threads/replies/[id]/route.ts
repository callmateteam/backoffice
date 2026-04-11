import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { publishReply } from "@/lib/threads";

const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const NOTION_API = "https://api.notion.com/v1";
const headers = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28",
};

// Update draft reply text or status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const properties: any = {};
  if (body.draftReply !== undefined) {
    properties["draftReply"] = { rich_text: [{ text: { content: body.draftReply } }] };
  }
  if (body.draftStatus) {
    properties["draftStatus"] = { select: { name: body.draftStatus } };
  }

  const res = await fetch(`${NOTION_API}/pages/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Publish reply to Threads
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  try {
    const result = await publishReply(id, body.text, body.replyToId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Reply publish failed:", error);
    return NextResponse.json({ error: "Failed to publish reply" }, { status: 500 });
  }
}
