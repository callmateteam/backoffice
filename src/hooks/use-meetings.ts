"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Meeting } from "@/types/meeting";

async function fetchMeetings(): Promise<Meeting[]> {
  const res = await fetch("/api/meetings");
  if (!res.ok) throw new Error("Failed to fetch meetings");
  return res.json();
}

export function useMeetings() {
  return useQuery({ queryKey: ["meetings"], queryFn: fetchMeetings });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Meeting, "id" | "createdAt">) => {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create meeting");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Meeting> & { id: string }) => {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update meeting");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete meeting");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}
