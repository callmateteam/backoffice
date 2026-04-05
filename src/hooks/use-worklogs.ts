"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkLog } from "@/types/worklog";

async function fetchWorkLogs(): Promise<WorkLog[]> {
  const res = await fetch("/api/worklogs");
  if (!res.ok) throw new Error("Failed to fetch worklogs");
  return res.json();
}

export function useWorkLogs() {
  return useQuery({ queryKey: ["worklogs"], queryFn: fetchWorkLogs });
}

export function useCreateWorkLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { date: string; content: string }) => {
      const res = await fetch("/api/worklogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create worklog");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["worklogs"] }),
  });
}

export function useUpdateWorkLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; content?: string; date?: string }) => {
      const res = await fetch(`/api/worklogs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update worklog");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["worklogs"] }),
  });
}
