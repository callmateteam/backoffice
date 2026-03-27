"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from "@/hooks/use-todos";
import { Plus, Trash2 } from "lucide-react";

interface TodoListProps {
  scheduleId: string;
}

export function TodoList({ scheduleId }: TodoListProps) {
  const { data: todos = [], isLoading } = useTodos(scheduleId);
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo(scheduleId);
  const deleteTodo = useDeleteTodo(scheduleId);
  const [newTitle, setNewTitle] = useState("");

  const completed = todos.filter((t) => t.completed).length;
  const total = todos.length;

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await createTodo.mutateAsync({ scheduleId, title: newTitle.trim() });
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
        <span className="text-sm font-medium">
          할 일 ({completed}/{total})
        </span>
        {total > 0 && (
          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-green-500 transition-all"
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
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
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
                className={`flex-1 text-sm ${
                  todo.completed ? "text-muted-foreground line-through" : ""
                }`}
              >
                {todo.title}
              </span>
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
          className="h-8 text-sm"
        />
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
