"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TARGET_ACCOUNTS, CATEGORIES } from "@/lib/target-accounts";
import { Search, Sparkles, Send, ExternalLink, MessageCircle, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function MonitorPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return <MonitorContent />;
}

function MonitorContent() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accountSearch, setAccountSearch] = useState("");

  // 수동 캡처 모달
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureUsername, setCaptureUsername] = useState("");
  const [captureText, setCaptureText] = useState("");
  const [capturePostId, setCapturePostId] = useState("");

  // 댓글 작성 모달
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState({ username: "", text: "", postId: "" });
  const [replyDraft, setReplyDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  // 키워드 검색 (API 권한 승인 후 활성화)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const filteredAccounts = useMemo(() => {
    return TARGET_ACCOUNTS.filter((a) => {
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (accountSearch && !a.username.includes(accountSearch) && !a.description.includes(accountSearch)) return false;
      return true;
    });
  }, [categoryFilter, accountSearch]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/threads/monitor?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        const data = await res.json();
        if (data.detail?.includes("permission")) {
          toast.error("키워드 검색 권한이 아직 승인되지 않았습니다. 수동 캡처를 사용해주세요.");
        } else {
          toast.error("검색에 실패했습니다.");
        }
        return;
      }
      const data = await res.json();
      setSearchResults(data);
    } catch {
      toast.error("검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const openCaptureForAccount = (username: string) => {
    setCaptureUsername(username);
    setCaptureText("");
    setCapturePostId("");
    setCaptureOpen(true);
  };

  const handleCapture = () => {
    if (!captureText.trim()) {
      toast.error("게시글 내용을 입력해주세요.");
      return;
    }
    setReplyTarget({
      username: captureUsername,
      text: captureText,
      postId: capturePostId,
    });
    setCaptureOpen(false);
    setReplyDraft("");
    setReplyOpen(true);
  };

  const handleGenerateReply = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/threads/monitor/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postText: replyTarget.text,
          username: replyTarget.username,
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
    if (!replyDraft.trim()) return;

    if (!replyTarget.postId) {
      // postId 없으면 클립보드에 복사만
      await navigator.clipboard.writeText(replyDraft);
      toast.success("댓글이 클립보드에 복사되었습니다. Threads에서 직접 붙여넣기 해주세요.");
      setReplyOpen(false);
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/threads/monitor/send-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyToId: replyTarget.postId,
          text: replyDraft,
        }),
      });
      if (!res.ok) throw new Error("발행 실패");
      toast.success("댓글이 발행되었습니다!");
      setReplyOpen(false);
    } catch {
      toast.error("발행 실패. 클립보드에 복사합니다.");
      await navigator.clipboard.writeText(replyDraft);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Threads 모니터링</h1>
            <p className="mt-1 text-sm text-gray-500">타겟 계정을 모니터링하고 자연스럽게 소통하세요</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => { setCaptureUsername(""); setCaptureText(""); setCapturePostId(""); setCaptureOpen(true); }}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              수동 캡처
            </Button>
            <Link href="/threads">
              <Button variant="outline" className="rounded-xl">
                ← Threads 관리
              </Button>
            </Link>
          </div>
        </div>

        {/* 키워드 검색 */}
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-800">키워드 검색</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="소상공인, 자영업, 창업..."
                className="rounded-xl pl-10"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searching}
              className="rounded-xl bg-linear-to-r from-indigo-600 to-violet-600"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-400">* keyword_search 권한 승인 후 자동 검색 가능. 미승인 시 수동 캡처를 사용하세요.</p>

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((post: any) => (
                <div key={post.id} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-indigo-600">@{post.username}</span>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-3">{post.text}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-lg text-xs"
                    onClick={() => {
                      setReplyTarget({ username: post.username, text: post.text, postId: post.id });
                      setReplyDraft("");
                      setReplyOpen(true);
                    }}
                  >
                    댓글
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 타겟 계정 */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-800">타겟 계정 ({filteredAccounts.length})</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              placeholder="계정 검색..."
              className="w-40 rounded-xl text-xs"
            />
            <div className="flex rounded-xl border border-gray-200 bg-white p-0.5">
              <button
                onClick={() => setCategoryFilter("all")}
                className={cn("rounded-lg px-2.5 py-1 text-xs font-medium", categoryFilter === "all" ? "bg-indigo-600 text-white" : "text-gray-500")}
              >
                전체
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={cn("rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap", categoryFilter === c ? "bg-indigo-600 text-white" : "text-gray-500")}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((account) => (
            <div
              key={account.username}
              className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-400 to-violet-400 text-xs font-bold text-white">
                      {account.username[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">@{account.username}</p>
                      <p className="truncate text-xs text-gray-400">{account.description}</p>
                    </div>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                  {account.category.split("/")[0]}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <a
                  href={`https://www.threads.com/@${account.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <ExternalLink className="h-3 w-3" />
                  프로필
                </a>
                <button
                  onClick={() => openCaptureForAccount(account.username)}
                  className="flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <MessageCircle className="h-3 w-3" />
                  캡처 → 댓글
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 수동 캡처 모달 */}
      <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>게시글 캡처</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Threads에서 게시글을 복사해서 붙여넣으면 AI가 맥락에 맞는 댓글을 생성합니다.
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700">작성자</label>
              <Input
                value={captureUsername}
                onChange={(e) => setCaptureUsername(e.target.value)}
                placeholder="@username"
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">게시글 내용 *</label>
              <textarea
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                placeholder="Threads 게시글 내용을 붙여넣으세요"
                rows={5}
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Post ID <span className="text-xs text-gray-400">(선택 — 있으면 API로 직접 댓글 발행 가능)</span>
              </label>
              <Input
                value={capturePostId}
                onChange={(e) => setCapturePostId(e.target.value)}
                placeholder="Threads Post ID (없으면 비워두세요)"
                className="mt-1 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCaptureOpen(false)}>취소</Button>
              <Button onClick={handleCapture} className="bg-linear-to-r from-indigo-600 to-violet-600">
                다음 → 댓글 생성
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 댓글 작성 모달 */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>댓글 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-indigo-600">@{replyTarget.username}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-5">
                {replyTarget.text}
              </p>
            </div>

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
                placeholder="댓글을 입력하거나 AI 생성을 사용하세요"
                rows={4}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-indigo-400"
              />
              <p className={cn("mt-1 text-xs", replyDraft.length > 500 ? "text-red-500" : "text-gray-400")}>
                {replyDraft.length}/500
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReplyOpen(false)}>취소</Button>
              <Button
                onClick={handleSendReply}
                disabled={sending || !replyDraft.trim()}
                className="bg-linear-to-r from-indigo-600 to-violet-600"
              >
                <Send className="mr-1.5 h-4 w-4" />
                {sending ? "발행 중..." : replyTarget.postId ? "댓글 발행" : "클립보드 복사"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
