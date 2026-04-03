import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getMeetings, appendMeeting } from "@/lib/google-sheets";
import { Meeting } from "@/types/meeting";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const meetings = await getMeetings(session.accessToken);
    return NextResponse.json(meetings);
  } catch (error) {
    console.error("Failed to fetch meetings:", error);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const meeting: Meeting = {
      id: uuidv4(),
      title: body.title,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      participants: body.participants || "",
      agenda: body.agenda || "",
      minutes: body.minutes || "",
      createdAt: new Date().toISOString(),
    };

    await appendMeeting(session.accessToken, meeting);
    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error("Failed to create meeting:", error);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
