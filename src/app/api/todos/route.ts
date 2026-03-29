import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getTodos, appendTodo } from "@/lib/google-sheets";
import { Todo } from "@/types";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scheduleId =
      request.nextUrl.searchParams.get("scheduleId") || undefined;
    const todos = await getTodos(session.accessToken, scheduleId);
    return NextResponse.json(todos);
  } catch (error) {
    console.error("Failed to fetch todos:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
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
    const todo: Todo = {
      id: uuidv4(),
      scheduleId: body.scheduleId,
      title: body.title,
      completed: false,
      order: body.order || 0,
      assignee: body.assignee || "",
      link: body.link || "",
      createdAt: new Date().toISOString(),
    };

    await appendTodo(session.accessToken, todo);
    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("Failed to create todo:", error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}
