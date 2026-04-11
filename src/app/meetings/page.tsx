"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichEditor } from "@/components/rich-editor";
import { useMeetings, useCreateMeeting, useUpdateMeeting, useDeleteMeeting } from "@/hooks/use-meetings";
import { getMemberList, getMemberName } from "@/lib/members";
import { Meeting } from "@/types/meeting";
import { Plus, Trash2, Pencil, Clock, Users, CalendarDays, FileText, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { renderContent } from "@/lib/markdown";

function decodeHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function getDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return "";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

function getStatus(meeting: Meeting): { label: string; className: string } {
  const minutesText = meeting.minutes?.replace(/<[^>]*>/g, "").trim();
  if (minutesText) return { label: "회의록 작성됨", className: "bg-emerald-50 text-emerald-600" };
  const agendaText = meeting.agenda?.replace(/<[^>]*>/g, "").trim();
  if (agendaText) return { label: "안건 작성됨", className: "bg-amber-50 text-amber-600" };
  return { label: "예정", className: "bg-blue-50 text-blue-600" };
}

export default function MeetingsPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return <MeetingsContent embedded={false} />;
}

export function MeetingsContent({ embedded }: { embedded?: boolean }) {
  const { data: meetings = [], isLoading } = useMeetings();
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const members = getMemberList();

  const [formOpen, setFormOpen] = useState(false);
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 생성 폼
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("16:00");
  const [participants, setParticipants] = useState<string[]>([]);

  // 수정 폼
  const [editAgenda, setEditAgenda] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editParticipants, setEditParticipants] = useState<string[]>([]);

  // 리마인더 체크 (페이지 로드 시 1회)
  useEffect(() => {
    fetch("/api/meetings/check-reminders", { method: "POST" }).catch(() => {});
  }, []);

  const openDetail = useCallback((m: Meeting) => {
    setDetailMeeting(m);
    setIsEditing(false);
    setEditAgenda(decodeHtml(m.agenda || ""));
    setEditMinutes(decodeHtml(m.minutes || ""));
    setEditTitle(m.title);
    setEditDate(m.date);
    setEditStartTime(m.startTime);
    setEditEndTime(m.endTime);
    setEditParticipants(m.participants?.split(",").filter(Boolean) || []);
  }, []);

  const toggleParticipant = (email: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(email) ? list.filter((a) => a !== email) : [...list, email]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) { toast.error("제목과 날짜는 필수입니다."); return; }
    try {
      await createMeeting.mutateAsync({
        title, date, startTime, endTime,
        participants: participants.join(","),
        agenda: "", minutes: "",
      });
      toast.success("회의가 등록되었습니다.");
      setTitle(""); setDate(""); setStartTime("14:00"); setEndTime("16:00"); setParticipants([]);
      setFormOpen(false);
    } catch { toast.error("등록에 실패했습니다."); }
  };

  const handleUpdate = async () => {
    if (!detailMeeting) return;
    try {
      await updateMeeting.mutateAsync({
        id: detailMeeting.id,
        title: editTitle,
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        participants: editParticipants.join(","),
        agenda: editAgenda,
        minutes: editMinutes,
      });
      toast.success("수정되었습니다.");
      setDetailMeeting(null);
      setIsEditing(false);
    } catch { toast.error("수정에 실패했습니다."); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 회의를 삭제하시겠습니까?")) return;
    try {
      await deleteMeeting.mutateAsync(id);
      toast.success("삭제되었습니다.");
      setDetailMeeting(null);
    } catch { toast.error("삭제에 실패했습니다."); }
  };

  const pageContent = (
    <>
      {!embedded && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">회의록</h1>
            <p className="mt-1 text-sm text-gray-500">팀 회의를 관리하고 회의록을 작성하세요</p>
          </div>
          <Button
            className="rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> 새 회의
          </Button>
        </div>
      )}
      {embedded && (
        <div className="mb-4 flex justify-end">
          <Button
            className="rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> 새 회의
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-96 items-center justify-center text-gray-400">로딩 중...</div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
            <FileText className="h-6 w-6 text-gray-300" />
          </div>
          <p className="mt-4 text-sm text-gray-400">등록된 회의가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => {
            const st = getStatus(m);
            return (
              <div
                key={m.id}
                className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => openDetail(m)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="font-semibold text-gray-900">{m.title}</span>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", st.className)}>{st.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-2">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{m.startTime} ~ {m.endTime} ({getDuration(m.startTime, m.endTime)})</span>
                    </div>
                    {m.participants && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {m.participants.split(",").filter(Boolean).map((p) => (
                          <span key={p} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                            {getMemberName(p)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600">{m.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 생성 모달 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>새 회의</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>제목 *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="회의 제목" autoFocus />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>날짜 *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>시작</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>종료</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>참여자</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button key={m.email} type="button" onClick={() => toggleParticipant(m.email, participants, setParticipants)}
                    className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                      participants.includes(m.email) ? "border-indigo-600 bg-indigo-600 text-white shadow-sm" : "border-gray-200 bg-white text-gray-500 hover:border-indigo-200 hover:bg-indigo-50"
                    )}>{m.name}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>취소</Button>
              <Button type="submit" disabled={createMeeting.isPending}>등록</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 상세/수정 모달 */}
      <Dialog open={!!detailMeeting} onOpenChange={() => { setDetailMeeting(null); setIsEditing(false); }}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto" showCloseButton={false}>
          {detailMeeting && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  {isEditing ? (
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-lg font-bold" />
                  ) : (
                    <DialogTitle className="text-lg">{detailMeeting.title}</DialogTitle>
                  )}
                  <div className="flex gap-1 shrink-0">
                    {!isEditing ? (
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4" /></Button>
                    ) : (
                      <Button size="sm" onClick={handleUpdate} disabled={updateMeeting.isPending}>저장</Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(detailMeeting.id)} disabled={deleteMeeting.isPending}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full flex-wrap">
                    <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-40" />
                    <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="w-28" />
                    <span>~</span>
                    <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="w-28" />
                  </div>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{detailMeeting.date}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{detailMeeting.startTime} ~ {detailMeeting.endTime} ({getDuration(detailMeeting.startTime, detailMeeting.endTime)})</span>
                  </>
                )}
              </div>

              {isEditing ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {members.map((m) => (
                    <button key={m.email} type="button" onClick={() => toggleParticipant(m.email, editParticipants, setEditParticipants)}
                      className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-all",
                        editParticipants.includes(m.email) ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-200 text-gray-500 hover:bg-indigo-50"
                      )}>{m.name}</button>
                  ))}
                </div>
              ) : detailMeeting.participants ? (
                <div className="flex items-center gap-2 mt-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1.5">
                    {detailMeeting.participants.split(",").filter(Boolean).map((p) => (
                      <span key={p} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">{getMemberName(p)}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <Separator className="my-3" />

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* 안건 */}
                <div className="rounded-xl bg-amber-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="text-sm font-bold text-gray-800">회의 안건</span>
                  </div>
                  {isEditing ? (
                    <>
                      <RichEditor value={editAgenda} onChange={setEditAgenda} placeholder="회의 안건을 입력하세요" />
                      <p className="text-xs text-gray-400 mt-1">2000자 제한 | Markdown, HTML 문법 지원</p>
                    </>
                  ) : (
                    <div className="notice-content text-sm text-gray-600 leading-relaxed min-h-[100px]"
                      dangerouslySetInnerHTML={{ __html: renderContent(detailMeeting.agenda || "") || '<span class="text-gray-400">작성된 안건이 없습니다</span>' }}
                    />
                  )}
                </div>

                {/* 회의록 */}
                <div className="rounded-xl bg-indigo-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <span className="text-sm font-bold text-gray-800">회의록</span>
                  </div>
                  {isEditing ? (
                    <RichEditor value={editMinutes} onChange={setEditMinutes} placeholder="회의록을 작성하세요" />
                  ) : (
                    <div className="notice-content text-sm text-gray-600 leading-relaxed min-h-[100px]"
                      dangerouslySetInnerHTML={{ __html: renderContent(detailMeeting.minutes || "") || '<span class="text-gray-400">작성된 회의록이 없습니다</span>' }}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) return pageContent;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {pageContent}
      </main>
    </>
  );
}
