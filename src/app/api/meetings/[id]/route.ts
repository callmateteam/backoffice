import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getMeetings, updateMeeting, deleteMeeting } from "@/lib/notion-db";
import { notifyMeetingMinutes } from "@/lib/discord";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const meetings = await getMeetings();
    const existing = meetings.find((m) => m.id === id);
    if (!existing) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const hadMinutes = !!existing.minutes?.replace(/<[^>]*>/g, "").trim();

    const updated = {
      ...existing,
      title: body.title ?? existing.title,
      date: body.date ?? existing.date,
      startTime: body.startTime ?? existing.startTime,
      endTime: body.endTime ?? existing.endTime,
      participants: body.participants ?? existing.participants,
      agenda: body.agenda ?? existing.agenda,
      minutes: body.minutes ?? existing.minutes,
    };

    await updateMeeting(updated);

    // 회의록이 새로 작성된 경우 Discord 알림
    const hasMinutesNow = !!updated.minutes?.replace(/<[^>]*>/g, "").trim();
    if (!hadMinutes && hasMinutesNow) {
      const siteUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
      notifyMeetingMinutes(updated.title, session.user?.email || "", siteUrl);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update meeting:", error);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteMeeting(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete meeting:", error);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
