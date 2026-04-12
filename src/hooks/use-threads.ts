"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ThreadPost {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  scheduledAt: string | null;
  threadsUrl: string | null;
  createdAt: string;
  views: number;
  likes: number;
  replyCount: number;
  reposts: number;
  quotes: number;
  shares: number;
}

export interface ThreadReply {
  id: string;
  content: string;
  username: string;
  timestamp: string;
  originalPost: string;
  originalUrl: string | null;
  createdAt: string;
  draftReply: string;
  draftStatus: string;
  replyId: string;
}

export function useThreadPosts() {
  return useQuery<ThreadPost[]>({
    queryKey: ["threads"],
    queryFn: async () => {
      const res = await fetch("/api/threads");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}

export function useThreadReplies() {
  return useQuery<ThreadReply[]>({
    queryKey: ["threads-replies"],
    queryFn: async () => {
      const res = await fetch("/api/threads/replies");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}

export function useUpdateThreadPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string; content?: string; scheduledAt?: string }) => {
      const res = await fetch(`/api/threads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["threads"] }),
  });
}

export function usePublishNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pageId: string) => {
      const res = await fetch("/api/threads/publish-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["threads"] }),
  });
}

export function useUpdateReplyDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, draftReply, draftStatus }: { id: string; draftReply?: string; draftStatus?: string }) => {
      const res = await fetch(`/api/threads/replies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftReply, draftStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["threads-replies"] }),
  });
}

export function usePublishReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text, replyToId }: { id: string; text: string; replyToId: string }) => {
      const res = await fetch(`/api/threads/replies/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, replyToId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["threads-replies"] }),
  });
}

export function useDeleteThreadPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/threads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["threads"] }),
  });
}
