"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Sparkles, Send, ExternalLink, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ThreadPost {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  permalink: string;
}

const PRESET_KEYWORDS = ["소상공인", "자영업", "창업", "사장", "매출", "폐업", "배달앱", "가게"];

export default function MonitorPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return <MonitorContent />;
}

function MonitorContent() {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [searching, setSearching] = useState(false);

  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ThreadPost | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSearch = async (keyword?: string) => {
    const q = keyword || query;
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/threads/monitor?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("검색 실패");
      const data = await res.json();
      setPosts(data);
      if (data.length === 0) toast("검색 결과가 없습니다.");
    } catch {
      toast.error("검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const openReplyModal = (post: ThreadPost) => {
    setSelectedPost(post);
    setReplyDraft("");
    setReplyModalOpen(true);
  };

  const handleGenerateReply = async () => {
    if (!selectedPost) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/threads/monitor/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postText: selectedPost.text,
          username: selectedPost.username,
        }),
      });
      if (!res.ok) throw new Error("생성 실패");
      const { reply } = await res.json();
      setReplyDraft(reply);
    } catch {
      toast.error("댓글 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedPost || !replyDraft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/threads/monitor/send-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyToId: selectedPost.id,
          text: replyDraft,
        }),
      });
      if (!res.ok) throw new Error("발행 실패");
      toast.success("댓글이 발행되었습니다!");
      setReplyModalOpen(false);
    } catch {
      toast.error("댓글 발행에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}분 전`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}시간 전`;
      const days = Math.floor(hours / 24);
      return `${days}일 전`;
    } catch {
      return ts;
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Threads 모니터링</h1>
            <p className="mt-1 text-sm text-gray-500">키워드로 게시글을 검색하고 자연스럽게 소통하세요</p>
          </div>
          <Link href="/threads">
            <Button variant="outline" className="rounded-xl">
              ← Threads 관리
            </Button>
          </Link>
        </div>

        {/* 검색 */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="키워드 검색..."
                className="rounded-xl pl-10"
              />
            </div>
            <Button
              onClick={() => handleSearch()}
              disabled={searching || !query.trim()}
              className="rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
            </Button>
          </div>

          {/* 프리셋 키워드 */}
          <div className="flex flex-wrap gap-2">
            {PRESET_KEYWORDS.map((kw) => (
              <button
                key={kw}
                onClick={() => { setQuery(kw); handleSearch(kw); }}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>

        {/* 결과 */}
        {posts.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{posts.length}개 게시글 발견</p>
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-indigo-400 to-violet-400 text-xs font-bold text-white">
                        {post.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">@{post.username}</span>
                      <span className="text-xs text-gray-400">{formatTime(post.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {post.text}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-xs"
                    onClick={() => openReplyModal(post)}
                  >
                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                    댓글 달기
                  </Button>
                  {post.permalink && (
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-50 hover:text-indigo-600"
                    >
                      <ExternalLink className="h-3 w-3" />
                      원문
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!searching && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 shadow-sm">
            <Search className="h-10 w-10 text-gray-200" />
            <p className="mt-4 text-sm text-gray-400">키워드를 검색하면 관련 게시글이 표시됩니다</p>
          </div>
        )}
      </main>

      {/* 댓글 작성 모달 */}
      <Dialog open={replyModalOpen} onOpenChange={setReplyModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>댓글 작성</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              {/* 원본 글 */}
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-700">@{selectedPost.username}</span>
                  <span className="text-xs text-gray-400">{formatTime(selectedPost.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-5">
                  {selectedPost.text}
                </p>
              </div>

              {/* 댓글 입력 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">댓글</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateReply}
                    disabled={generating}
                    className="rounded-lg text-xs"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {generating ? "생성 중..." : "AI 댓글 생성"}
                  </Button>
                </div>
                <textarea
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder="댓글을 입력하거나 AI 생성 버튼을 눌러보세요"
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <p className={cn("mt-1 text-xs", replyDraft.length > 500 ? "text-red-500" : "text-gray-400")}>
                  {replyDraft.length}/500
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReplyModalOpen(false)}>
                  취소
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={sending || !replyDraft.trim()}
                  className="bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  {sending ? "발행 중..." : "댓글 발행"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
