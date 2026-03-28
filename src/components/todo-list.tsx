"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from "@/hooks/use-todos";
import { getMemberList, getMemberName } from "@/lib/members";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoListProps {
  scheduleId: string;
}

const members = getMemberList();

export function TodoList({ scheduleId }: TodoListProps) {
  const { data: todos = [], isLoading } = useTodos(scheduleId);
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo(scheduleId);
  const deleteTodo = useDeleteTodo(scheduleId);
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");

  const completed = todos.filter((t) => t.completed).length;
  const total = todos.length;

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await createTodo.mutateAsync({
      scheduleId,
      title: newTitle.trim(),
      assignee: newAssignee,
    });
    setNewTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">
          할 일 ({completed}/{total})
        </span>
        {total > 0 && (
          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all"
              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-1">
        {todos
          .sort((a, b) => a.order - b.order)
          .map((todo) => (
            <div
              key={todo.id}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
            >
              <Checkbox
                checked={todo.completed}
                onCheckedChange={(checked) =>
                  updateTodo.mutate({
                    id: todo.id,
                    completed: checked === true,
                  })
                }
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  todo.completed && "text-gray-400 line-through"
                )}
              >
                {todo.title}
              </span>
              {todo.assignee && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                  {getMemberName(todo.assignee)}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={() => deleteTodo.mutate(todo.id)}
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="할 일 추가..."
          className="h-8 flex-1 text-sm"
        />
        <select
          value={newAssignee}
          onChange={(e) => setNewAssignee(e.target.value)}
          className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-600 outline-none focus:border-indigo-400"
        >
          <option value="">담당자</option>
          {members.map((m) => (
            <option key={m.email} value={m.email}>
              {m.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAdd}
          disabled={!newTitle.trim() || createTodo.isPending}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
