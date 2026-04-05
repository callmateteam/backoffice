import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getWorkLogs, updateWorkLog } from "@/lib/google-sheets";

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
    const logs = await getWorkLogs(session.accessToken);
    const existing = logs.find((l) => l.id === id);
    if (!existing) {
      return NextResponse.json({ error: "WorkLog not found" }, { status: 404 });
    }

    const updated = {
      ...existing,
      content: body.content ?? existing.content,
      date: body.date ?? existing.date,
    };

    await updateWorkLog(session.accessToken, updated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update worklog:", error);
    return NextResponse.json({ error: "Failed to update worklog" }, { status: 500 });
  }
}
