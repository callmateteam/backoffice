import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getSchedules, appendSchedule } from "@/lib/notion-db";
import { Schedule } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { notifyNewSchedule } from "@/lib/discord";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schedules = await getSchedules();
    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
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
    const now = new Date().toISOString();
    const schedule: Schedule = {
      id: uuidv4(),
      title: body.title,
      description: body.description || "",
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status || "todo",
      assignee: body.assignee || session.user?.email || "",
      color: body.color || "#3b82f6",
      createdAt: now,
      updatedAt: now,
    };

    await appendSchedule(schedule);
    notifyNewSchedule(schedule.title, schedule.assignee, schedule.startDate, schedule.endDate);
    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Failed to create schedule:", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}
