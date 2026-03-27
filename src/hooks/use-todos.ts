"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Todo, CreateTodoInput, UpdateTodoInput } from "@/types";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useTodos(scheduleId?: string) {
  return useQuery<Todo[]>({
    queryKey: ["todos", scheduleId],
    queryFn: () => {
      const params = scheduleId ? `?scheduleId=${scheduleId}` : "";
      return fetchJSON(`/api/todos${params}`);
    },
    enabled: !!scheduleId,
  });
}

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTodoInput) =>
      fetchJSON<Todo>("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["todos", variables.scheduleId] });
    },
  });
}

export function useUpdateTodo(scheduleId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTodoInput) =>
      fetchJSON<Todo>(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos", scheduleId] });
    },
  });
}

export function useDeleteTodo(scheduleId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON(`/api/todos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos", scheduleId] });
    },
  });
}
