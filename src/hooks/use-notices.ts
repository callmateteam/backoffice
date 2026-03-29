"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Notice } from "@/types/notice";

async function fetchNotices(): Promise<Notice[]> {
  const res = await fetch("/api/notices");
  if (!res.ok) throw new Error("Failed to fetch notices");
  return res.json();
}

export function useNotices() {
  return useQuery({ queryKey: ["notices"], queryFn: fetchNotices });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create notice");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notices"] }),
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete notice");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notices"] }),
  });
}
