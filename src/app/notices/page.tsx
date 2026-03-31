"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichEditor } from "@/components/rich-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNotices, useCreateNotice, useDeleteNotice } from "@/hooks/use-notices";
import { getMemberName } from "@/lib/members";
import { Plus, Trash2, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { Notice } from "@/types/notice";

export default function NoticesPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return <NoticesContent userEmail={session.user?.email || ""} />;
}

function NoticesContent({ userEmail }: { userEmail: string }) {
  const { data: notices = [], isLoading } = useNotices();
  const createNotice = useCreateNotice();
  const deleteNotice = useDeleteNotice();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    try {
      await createNotice.mutateAsync({ title: title.trim(), content: content.trim() });
      toast.success("공지사항이 등록되었습니다.");
      setTitle("");
      setContent("");
      setFormOpen(false);
    } catch {
      toast.error("등록에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 공지사항을 삭제하시겠습니까?")) return;
    try {
      await deleteNotice.mutateAsync(id);
      toast.success("삭제되었습니다.");
      setSelectedNotice(null);
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "yyyy.MM.dd (EEE) HH:mm", { locale: ko });
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
            <h1 className="text-2xl font-bold text-gray-900">공지사항</h1>
            <p className="mt-1 text-sm text-gray-500">팀 공지사항을 확인하세요</p>
          </div>
          <Button
            className="rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            작성
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-96 items-center justify-center text-gray-400">로딩 중...</div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
              <Megaphone className="h-6 w-6 text-gray-300" />
            </div>
            <p className="mt-4 text-sm text-gray-400">등록된 공지사항이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => setSelectedNotice(notice)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">{notice.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-gray-500">
                      {notice.content.replace(/<[^>]*>/g, "")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                      {getMemberName(notice.author)}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">{formatDate(notice.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 작성 모달 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>공지사항 작성</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="notice-title">제목 *</Label>
              <Input
                id="notice-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="공지 제목"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>내용</Label>
              <RichEditor
                value={content}
                onChange={setContent}
                placeholder="공지 내용을 입력하세요"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={createNotice.isPending}>
                등록
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 상세 모달 */}
      <Dialog open={!!selectedNotice} onOpenChange={() => setSelectedNotice(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" showCloseButton={false}>
          {selectedNotice && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <DialogTitle className="text-lg">{selectedNotice.title}</DialogTitle>
                  {selectedNotice.author === userEmail && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(selectedNotice.id)}
                      disabled={deleteNotice.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                    {getMemberName(selectedNotice.author)}
                  </span>
                  <span>{formatDate(selectedNotice.createdAt)}</span>
                </div>
                <div
                  className="notice-content text-sm leading-relaxed text-gray-700"
                  dangerouslySetInnerHTML={{ __html: selectedNotice.content }}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
