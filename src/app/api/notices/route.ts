import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getNotices, appendNotice } from "@/lib/notion-db";
import { Notice } from "@/types/notice";
import { v4 as uuidv4 } from "uuid";
import { notifyNewNotice } from "@/lib/discord";
import { getMemberName } from "@/lib/members";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notices = await getNotices();
    return NextResponse.json(notices);
  } catch (error) {
    console.error("Failed to fetch notices:", error);
    return NextResponse.json(
      { error: "Failed to fetch notices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const notice: Notice = {
      id: uuidv4(),
      title: body.title,
      content: body.content,
      author: session.user?.email || "",
      createdAt: new Date().toISOString(),
    };

    await appendNotice(notice);
    notifyNewNotice(notice.title, getMemberName(notice.author));
    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    console.error("Failed to create notice:", error);
    return NextResponse.json(
      { error: "Failed to create notice" },
      { status: 500 }
    );
  }
}
