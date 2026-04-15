import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { publishReply } from "@/lib/threads";

const NOTION_API = "https://api.notion.com/v1";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN!}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };
}

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

  try {
    const res = await fetch(`${NOTION_API}/pages/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ properties }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Reply draft update failed:", errorText);
      return NextResponse.json({ error: errorText }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reply draft update exception:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
