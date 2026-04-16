"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useThreadPosts,
  useThreadReplies,
  useUpdateThreadPost,
  useDeleteThreadPost,
  useUpdateReplyDraft,
  usePublishReply,
  usePublishNow,
  type ThreadPost,
} from "@/hooks/use-threads";
import {
  MessageCircle,
  Check,
  X,
  ExternalLink,
  Clock,
  Send,
  Trash2,
  Eye,
  User,
  Sparkles,
  Pencil,
  Eye as EyeIcon,
  Heart,
  Repeat2,
  Quote,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  초안: { label: "초안", color: "text-gray-600", bg: "bg-gray-100" },
  승인: { label: "승인", color: "text-blue-600", bg: "bg-blue-100" },
  발행중: { label: "발행중", color: "text-yellow-600", bg: "bg-yellow-100" },
  발행완료: { label: "발행완료", color: "text-green-600", bg: "bg-green-100" },
  발행실패: { label: "발행실패", color: "text-red-600", bg: "bg-red-100" },
  폐기: { label: "폐기", color: "text-gray-400", bg: "bg-gray-50" },
};

const TYPE_COLORS: Record<string, string> = {
  공감형: "bg-blue-50 text-blue-700",
  고백형: "bg-purple-50 text-purple-700",
  반전형: "bg-yellow-50 text-yellow-700",
  인사이트형: "bg-green-50 text-green-700",
  논쟁형: "bg-red-50 text-red-700",
  질문형: "bg-orange-50 text-orange-700",
  미시서사형: "bg-pink-50 text-pink-700",
  MBTI형: "bg-gray-50 text-gray-700",
  아무도안말하는형: "bg-amber-50 text-amber-700",
  관점전환형: "bg-teal-50 text-teal-700",
};

export default function ThreadsPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return <ThreadsContent />;
}

function ThreadsContent() {
  const { data: posts = [], isLoading } = useThreadPosts();
  const { data: allReplies = [] } = useThreadReplies();
  const updatePost = useUpdateThreadPost();
  const deletePost = useDeleteThreadPost();
  const updateReplyDraft = useUpdateReplyDraft();
  const publishReply = usePublishReply();
  const publishNow = usePublishNow();
  const [selectedPost, setSelectedPost] = useState<ThreadPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingDraftText, setEditingDraftText] = useState("");
  const [writeOpen, setWriteOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("공감형");
  const [publishAfterCreate, setPublishAfterCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [polishing, setPolishing] = useState(false);

  const filteredPosts = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  const statusCounts = posts.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleApprove = async (id: string) => {
    try {
      await updatePost.mutateAsync({ id, status: "승인" });
      toast.success("승인 완료! 예약 시간에 자동 발행됩니다.");
      setSelectedPost(null);
    } catch {
      toast.error("승인 실패");
    }
  };

  const handleDiscard = async (id: string) => {
    if (!confirm("이 초안을 거절하고 DB에서 삭제하시겠습니까?")) return;
    try {
      await deletePost.mutateAsync(id);
      toast.success("거절되어 삭제되었습니다.");
      setSelectedPost(null);
    } catch {
      toast.error("실패");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      await deletePost.mutateAsync(id);
      toast.success("삭제되었습니다.");
      setSelectedPost(null);
    } catch {
      toast.error("삭제 실패");
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updatePost.mutateAsync({ id, content: editContent });
      toast.success("수정 완료");
      setSelectedPost(null);
    } catch {
      toast.error("수정 실패");
    }
  };

  const handleCreateManual = async () => {
    if (!newContent.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }
    if (newContent.length > 500) {
      toast.error("500자 이하로 작성해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const preview = newContent.slice(0, 15).replace(/\n/g, " ");
      const createRes = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[${newType}] ${preview}...`,
          content: newContent,
          type: newType,
        }),
      });
      if (!createRes.ok) throw new Error("생성 실패");
      const { id } = await createRes.json();

      if (publishAfterCreate) {
        // 승인 상태로 변경 후 발행
        await fetch(`/api/threads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "승인" }),
        });
        const pubRes = await fetch("/api/threads/publish-now", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: id }),
        });
        if (!pubRes.ok) throw new Error("발행 실패");
        toast.success("작성 후 바로 발행 완료!");
      } else {
        toast.success("초안으로 저장되었습니다.");
      }

      setNewContent("");
      setNewType("공감형");
      setPublishAfterCreate(false);
      setWriteOpen(false);
      // 목록 새로고침 — React Query invalidate
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error("실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePolish = async () => {
    if (!newContent.trim()) {
      toast.error("내용을 먼저 입력해주세요.");
      return;
    }
    setPolishing(true);
    try {
      const res = await fetch("/api/threads/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) throw new Error("다듬기 실패");
      const { polished } = await res.json();
      if (polished) {
        setNewContent(polished);
        toast.success("AI가 다듬었습니다. 확인 후 수정하세요.");
      }
    } catch {
      toast.error("다듬기에 실패했습니다.");
    } finally {
      setPolishing(false);
    }
  };

  const openDetail = (post: ThreadPost) => {
    setSelectedPost(post);
    setEditContent(post.content);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MM.dd (EEE) HH:mm", { locale: ko });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Threads 관리</h1>
            <p className="mt-1 text-sm text-gray-500">
              AI가 생성한 초안을 확인하고 승인하세요
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setWriteOpen(true)}
              className="rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700"
            >
              <Pencil className="mr-2 h-4 w-4" />
              직접 작성
            </Button>
            <Link href="/threads/replies">
              <Button variant="outline" className="rounded-xl">
                <MessageCircle className="mr-2 h-4 w-4" />
                댓글 보기
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              filter === "all"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            전체 {posts.length}
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, config]) =>
            statusCounts[key] ? (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                  filter === key
                    ? `${config.bg} ${config.color}`
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {config.label} {statusCounts[key]}
              </button>
            ) : null
          )}
        </div>

        {isLoading ? (
          <div className="flex h-96 items-center justify-center text-gray-400">
            로딩 중...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
              <Send className="h-6 w-6 text-gray-300" />
            </div>
            <p className="mt-4 text-sm text-gray-400">게시물이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => {
              const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG["초안"];
              const typeColor = TYPE_COLORS[post.type] || "bg-gray-50 text-gray-700";
              return (
                <div
                  key={post.id}
                  className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() => openDetail(post)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            statusCfg.bg,
                            statusCfg.color
                          )}
                        >
                          {statusCfg.label}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            typeColor
                          )}
                        >
                          {post.type}
                        </span>
                      </div>
                      <p className="line-clamp-3 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                        {post.content}
                      </p>
                      {post.status === "발행완료" && (
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <EyeIcon className="h-3 w-3" />
                            {post.views.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {post.likes.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {post.replyCount.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Repeat2 className="h-3 w-3" />
                            {post.reposts.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            {post.shares.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-gray-400">
                        {formatDate(post.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {post.content.length}자
                      </p>
                      {post.status === "초안" && (
                        <div className="mt-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(post.id);
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDiscard(post.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {post.status === "승인" && (
                        <Button
                          size="sm"
                          className="mt-2 h-7 bg-indigo-600 text-xs hover:bg-indigo-700"
                          disabled={publishNow.isPending}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await publishNow.mutateAsync(post.id);
                              toast.success("발행 완료!");
                            } catch {
                              toast.error("발행 실패");
                            }
                          }}
                        >
                          <Send className="mr-1 h-3 w-3" />
                          발행
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <Dialog
        open={!!selectedPost}
        onOpenChange={() => setSelectedPost(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      STATUS_CONFIG[selectedPost.status]?.bg,
                      STATUS_CONFIG[selectedPost.status]?.color
                    )}
                  >
                    {selectedPost.status}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      TYPE_COLORS[selectedPost.type]
                    )}
                  >
                    {selectedPost.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {selectedPost.content.length}자
                  </span>
                </div>
                <DialogTitle className="sr-only">게시물 상세</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {selectedPost.status === "초안" ? (
                  <textarea
                    className="w-full rounded-lg border border-gray-200 p-3 text-sm leading-relaxed focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300 focus:outline-none"
                    rows={8}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                ) : (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {selectedPost.content}
                  </p>
                )}

                {selectedPost.threadsUrl && (
                  <a
                    href={selectedPost.threadsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Threads에서 보기
                  </a>
                )}

                {selectedPost.status === "발행완료" && (
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <EyeIcon className="h-3 w-3" /> 조회
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedPost.views.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Heart className="h-3 w-3" /> 좋아요
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedPost.likes.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MessageCircle className="h-3 w-3" /> 댓글
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedPost.replyCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Repeat2 className="h-3 w-3" /> 리포스트
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedPost.reposts.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Quote className="h-3 w-3" /> 인용
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedPost.quotes.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Share2 className="h-3 w-3" /> 공유
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedPost.shares.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {selectedPost.scheduledAt && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="h-3 w-3" />
                    예약: {formatDate(selectedPost.scheduledAt)}
                  </div>
                )}

                {/* Replies Section */}
                {(() => {
                  const postReplies = allReplies.filter(
                    (r) => r.originalUrl === selectedPost.threadsUrl && selectedPost.threadsUrl
                  );
                  if (postReplies.length === 0) return null;

                  // Separate replies vs nested replies (title starts with ↳)
                  const isNested = (r: typeof postReplies[0]) => {
                    // Check the title in allReplies - nested ones have ↳ prefix
                    // We detect by checking if username appears as "→ @someone" pattern in other replies
                    return postReplies.some(
                      (other) => other.id !== r.id && r.content && other.username &&
                      r.timestamp && other.timestamp &&
                      new Date(r.timestamp) > new Date(other.timestamp) &&
                      r.username !== other.username
                    );
                  };

                  // Simple approach: sort by timestamp, detect nested by ↳ in Notion title
                  const sorted = [...postReplies].sort(
                    (a, b) => new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime()
                  );

                  // Color map for usernames
                  const colorPalette = [
                    "from-blue-100 to-blue-200 text-blue-600",
                    "from-purple-100 to-purple-200 text-purple-600",
                    "from-green-100 to-green-200 text-green-600",
                    "from-orange-100 to-orange-200 text-orange-600",
                    "from-pink-100 to-pink-200 text-pink-600",
                    "from-teal-100 to-teal-200 text-teal-600",
                  ];
                  const userColors: Record<string, string> = {};
                  let colorIdx = 0;
                  sorted.forEach((r) => {
                    if (!userColors[r.username]) {
                      userColors[r.username] = colorPalette[colorIdx % colorPalette.length];
                      colorIdx++;
                    }
                  });

                  return (
                    <div className="border-t pt-3">
                      <div className="mb-2 flex items-center gap-1.5">
                        <MessageCircle className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          댓글 {postReplies.length}개
                        </span>
                      </div>
                      <div className="space-y-1 rounded-lg bg-gray-50 p-3">
                        {sorted.map((reply) => {
                          const isReply = reply.username === "themuselab.official" ||
                            sorted.findIndex((r) => r.id === reply.id) > 0 &&
                            new Date(reply.timestamp || reply.createdAt) > new Date(sorted[0].timestamp || sorted[0].createdAt) &&
                            reply.username !== sorted[0].username;
                          // Detect nested: if this reply's timestamp is after another reply by a different user
                          const parentReply = sorted.find(
                            (r) => r.id !== reply.id &&
                            r.username !== reply.username &&
                            new Date(r.timestamp || r.createdAt) < new Date(reply.timestamp || reply.createdAt)
                          );
                          const isNestedReply = !!parentReply;
                          const colors = userColors[reply.username] || colorPalette[0];
                          const [gradientColors, textColor] = [
                            colors.split(" ").slice(0, 2).join(" "),
                            colors.split(" ")[2] || "text-indigo-600",
                          ];

                          return (
                            <div
                              key={reply.id}
                              className={cn(
                                "flex items-start gap-2.5 rounded-lg p-2 transition-colors",
                                isNestedReply ? "ml-8 border-l-2 border-indigo-200 pl-3" : ""
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br",
                                  gradientColors
                                )}
                              >
                                <span className={cn("text-xs font-bold", textColor)}>
                                  {reply.username[0]?.toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`https://www.threads.com/@${reply.username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-gray-900 hover:text-indigo-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    @{reply.username}
                                  </a>
                                  {isNestedReply && parentReply && (
                                    <span className="text-xs text-gray-400">
                                      → @{parentReply.username}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400">
                                    {formatDate(reply.timestamp || reply.createdAt)}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                                  {reply.content}
                                </p>

                                {/* AI Draft Reply */}
                                {reply.draftReply && reply.draftStatus && reply.draftStatus !== "불필요" && (
                                  <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5">
                                    <div className="mb-1.5 flex items-center gap-1.5">
                                      <Sparkles className="h-3 w-3 text-indigo-500" />
                                      <span className="text-xs font-medium text-indigo-600">AI 답글 초안</span>
                                      {reply.draftStatus === "발행완료" && (
                                        <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-600">발행됨</span>
                                      )}
                                    </div>

                                    {editingDraftId === reply.id ? (
                                      <div className="space-y-2">
                                        <textarea
                                          className="w-full rounded border border-indigo-200 bg-white p-2 text-sm focus:border-indigo-400 focus:outline-none"
                                          rows={3}
                                          value={editingDraftText}
                                          onChange={(e) => setEditingDraftText(e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex gap-1.5">
                                          <Button size="sm" variant="outline" className="h-7 text-xs"
                                            onClick={(e) => { e.stopPropagation(); setEditingDraftId(null); }}>
                                            취소
                                          </Button>
                                          <Button size="sm" className="h-7 text-xs" disabled={updateReplyDraft.isPending}
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await updateReplyDraft.mutateAsync({ id: reply.id, draftReply: editingDraftText });
                                              setEditingDraftId(null);
                                              toast.success("수정 완료");
                                            }}>
                                            저장
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p className="text-sm text-gray-700 whitespace-pre-line">{reply.draftReply}</p>
                                        {reply.draftStatus === "초안" && (
                                          <div className="mt-2 flex gap-1.5">
                                            <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-500"
                                              onClick={(e) => { e.stopPropagation(); setEditingDraftId(reply.id); setEditingDraftText(reply.draftReply); }}>
                                              <Pencil className="mr-1 h-3 w-3" /> 수정
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400"
                                              disabled={updateReplyDraft.isPending}
                                              onClick={async (e) => { e.stopPropagation(); await updateReplyDraft.mutateAsync({ id: reply.id, draftStatus: "불필요" }); toast.success("무시됨"); }}>
                                              <X className="mr-1 h-3 w-3" /> 무시
                                            </Button>
                                            <Button size="sm" className="h-7 bg-indigo-600 text-xs hover:bg-indigo-700"
                                              disabled={publishReply.isPending}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                  await publishReply.mutateAsync({ id: reply.id, text: reply.draftReply, replyToId: reply.replyId });
                                                  toast.success("답글 발행 완료!");
                                                } catch { toast.error("답글 발행 실패"); }
                                              }}>
                                              <Send className="mr-1 h-3 w-3" /> 답글 발행
                                            </Button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-between gap-2 border-t pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => handleDelete(selectedPost.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    삭제
                  </Button>

                  <div className="flex gap-2">
                    {selectedPost.status === "초안" && (
                      <>
                        {editContent !== selectedPost.content && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveEdit(selectedPost.id)}
                            disabled={updatePost.isPending}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            수정 저장
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-200"
                          onClick={() => handleDiscard(selectedPost.id)}
                          disabled={updatePost.isPending}
                        >
                          <X className="mr-1 h-4 w-4" />
                          폐기
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(selectedPost.id)}
                          disabled={updatePost.isPending}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          승인
                        </Button>
                      </>
                    )}
                    {selectedPost.status === "승인" && (
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        disabled={publishNow.isPending}
                        onClick={async () => {
                          try {
                            await publishNow.mutateAsync(selectedPost.id);
                            toast.success("Threads에 발행 완료!");
                            setSelectedPost(null);
                          } catch {
                            toast.error("발행 실패");
                          }
                        }}
                      >
                        <Send className="mr-1 h-4 w-4" />
                        {publishNow.isPending ? "발행 중..." : "지금 발행"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 직접 작성 모달 */}
      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>직접 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">유형</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
              >
                {Object.keys(TYPE_COLORS).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                본문 <span className={cn("text-xs", newContent.length > 500 ? "text-red-500" : "text-gray-400")}>({newContent.length}/500)</span>
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="오늘 만난 사장님이..."
                rows={10}
                className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePolish}
                disabled={polishing || !newContent.trim()}
                className="rounded-lg text-xs"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {polishing ? "다듬는 중..." : "AI 다듬기"}
              </Button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishAfterCreate}
                  onChange={(e) => setPublishAfterCreate(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">바로 발행</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setWriteOpen(false)}>
                취소
              </Button>
              <Button
                onClick={handleCreateManual}
                disabled={submitting || !newContent.trim()}
                className="bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
              >
                {submitting ? "처리 중..." : publishAfterCreate ? "작성 + 바로 발행" : "초안으로 저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
