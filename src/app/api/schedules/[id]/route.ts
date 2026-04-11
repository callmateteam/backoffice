import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  getSchedules,
  updateSchedule,
  deleteSchedule,
  deleteTodo,
  getTodos,
} from "@/lib/notion-db";

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
    const schedules = await getSchedules();
    const existing = schedules.find((s) => s.id === id);
    if (!existing) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    const updated = {
      ...existing,
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    };

    await updateSchedule(updated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
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
    const todos = await getTodos(id);
    for (const todo of todos) {
      await deleteTodo(todo.id);
    }
    await deleteSchedule(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete schedule:", error);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    );
  }
}
