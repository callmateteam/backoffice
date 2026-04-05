"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkLogs, useCreateWorkLog, useUpdateWorkLog } from "@/hooks/use-worklogs";
import { getMemberName } from "@/lib/members";
import { renderMarkdown } from "@/lib/markdown";
import { WorkLog } from "@/types/worklog";
import { Plus, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isWithinInterval, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MEMBER_COLORS: Record<string, string> = {
  "victory.jun01@gmail.com": "from-indigo-500 to-violet-500",
  "ihayoem@gmail.com": "from-pink-500 to-rose-500",
  "workingminjee@gmail.com": "from-emerald-500 to-teal-500",
  "jbinyim991214@gmail.com": "from-amber-500 to-orange-500",
};

type ViewMode = "day" | "week" | "month";

export default function WorkLogsPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return <WorkLogsContent userEmail={session.user?.email || ""} />;
}

function WorkLogsContent({ userEmail }: { userEmail: string }) {
  const { data: logs = [], isLoading } = useWorkLogs();
  const createWorkLog = useCreateWorkLog();
  const updateWorkLog = useUpdateWorkLog();

  const [formOpen, setFormOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<WorkLog | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());

  // 작성 폼
  const [todayWork, setTodayWork] = useState("");
  const [notes, setNotes] = useState("");
  const [tomorrowWork, setTomorrowWork] = useState("");

  // 수정 폼
  const [editContent, setEditContent] = useState("");

  const assignees = useMemo(() => {
    return [...new Set(logs.map((l) => l.author).filter(Boolean))];
  }, [logs]);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // 날짜 범위 필터
  const filtered = useMemo(() => {
    let dateStart: Date;
    let dateEnd: Date;

    if (viewMode === "day") {
      const d = format(currentDate, "yyyy-MM-dd");
      return logs.filter((l) => {
        if (assigneeFilter !== "all" && l.author !== assigneeFilter) return false;
        return l.date === d;
      });
    } else if (viewMode === "week") {
      dateStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      dateEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      dateStart = startOfMonth(currentDate);
      dateEnd = endOfMonth(currentDate);
    }

    return logs.filter((l) => {
      if (assigneeFilter !== "all" && l.author !== assigneeFilter) return false;
      try {
        const d = parseISO(l.date);
        return isWithinInterval(d, { start: dateStart, end: dateEnd });
      } catch { return false; }
    });
  }, [logs, assigneeFilter, viewMode, currentDate]);

  const navigate = (dir: number) => {
    if (viewMode === "day") setCurrentDate((d) => dir > 0 ? addDays(d, 1) : subDays(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate((d) => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
  };

  const dateLabel = () => {
    if (viewMode === "day") return format(currentDate, "yyyy.MM.dd (EEE)", { locale: ko });
    if (viewMode === "week") {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(s, "MM.dd")} ~ ${format(e, "MM.dd")}`;
    }
    return format(currentDate, "yyyy년 M월", { locale: ko });
  };

  const buildContent = () => {
    let content = "";
    if (todayWork.trim()) content += `## 📌 오늘 진행 업무\n${todayWork.trim()}\n\n`;
    if (notes.trim()) content += `## ⚠️ 특이사항\n${notes.trim()}\n\n`;
    if (tomorrowWork.trim()) content += `## 📅 내일 예정업무\n${tomorrowWork.trim()}`;
    return content.trim();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todayWork.trim()) { toast.error("오늘 진행 업무를 입력해주세요."); return; }
    try {
      await createWorkLog.mutateAsync({ date: todayStr, content: buildContent() });
      toast.success("업무일지가 작성되었습니다.");
      setTodayWork(""); setNotes(""); setTomorrowWork("");
      setFormOpen(false);
    } catch { toast.error("작성에 실패했습니다."); }
  };

  const handleUpdate = async () => {
    if (!detailLog) return;
    try {
      await updateWorkLog.mutateAsync({ id: detailLog.id, content: editContent });
      toast.success("수정되었습니다.");
      setDetailLog(null); setIsEditing(false);
    } catch { toast.error("수정에 실패했습니다."); }
  };

  const getPreview = (content: string) => {
    return content
      .replace(/^##.+$/gm, "")
      .replace(/^- /gm, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .split("\n")
      .filter((l) => l.trim())
      .slice(0, 2)
      .join(". ");
  };

  const getSectionTags = (content: string) => {
    const tags: string[] = [];
    if (content.includes("오늘 진행 업무")) {
      const lines = content.split("오늘 진행 업무")[1]?.split("##")[0]?.split("\n").filter((l) => l.trim().startsWith("-")).length || 0;
      if (lines > 0) tags.push(`진행 업무 ${lines}건`);
    }
    if (content.includes("특이사항")) tags.push("특이사항");
    if (content.includes("내일 예정업무")) {
      const lines = content.split("내일 예정업무")[1]?.split("##")[0]?.split("\n").filter((l) => l.trim().startsWith("-")).length || 0;
      if (lines > 0) tags.push(`내일 예정 ${lines}건`);
    }
    return tags;
  };

  const colorClass = (email: string) => MEMBER_COLORS[email] || "from-gray-400 to-gray-500";

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">업무일지</h1>
            <p className="mt-1 text-sm text-gray-500">매일 업무 내용을 기록하고 팀원들의 진행 상황을 확인하세요</p>
          </div>
          <Button
            className="rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> 오늘 일지 작성
          </Button>
        </div>

        {/* 필터 */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* 멤버 필터 */}
            <div className="flex rounded-xl border border-gray-200 bg-white p-0.5">
              <button onClick={() => setAssigneeFilter("all")}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-all", assigneeFilter === "all" ? "bg-indigo-600 text-white" : "text-gray-500")}>
                전체
              </button>
              {assignees.map((a) => (
                <button key={a} onClick={() => setAssigneeFilter(a)}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-all", assigneeFilter === a ? "bg-indigo-600 text-white" : "text-gray-500")}>
                  {getMemberName(a)}
                </button>
              ))}
            </div>

            {/* 기간 뷰 */}
            <div className="flex rounded-xl border border-gray-200 bg-white p-0.5">
              {(["day", "week", "month"] as ViewMode[]).map((v) => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-all", viewMode === v ? "bg-indigo-600 text-white" : "text-gray-500")}>
                  {v === "day" ? "일별" : v === "week" ? "주별" : "월별"}
                </button>
              ))}
            </div>
          </div>

          {/* 날짜 네비 */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-semibold">{dateLabel()}</span>
            <button onClick={() => navigate(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="ml-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50">
              오늘
            </button>
          </div>
        </div>

        {/* 일지 목록 */}
        {isLoading ? (
          <div className="flex h-96 items-center justify-center text-gray-400">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 shadow-sm">
            <p className="text-sm text-gray-400">해당 기간에 작성된 업무일지가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((log) => (
              <div key={log.id}
                className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => { setDetailLog(log); setIsEditing(false); setEditContent(log.content); }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-sm font-bold text-white", colorClass(log.author))}>
                      {getMemberName(log.author)[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-gray-900">{getMemberName(log.author)}</span>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{getPreview(log.content)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {getSectionTags(log.content).map((tag) => (
                          <span key={tag} className="rounded-md bg-gray-50 px-2 py-0.5 text-[11px] text-gray-400">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600">{log.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 작성 모달 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>오늘 업무일지 작성</DialogTitle>
              <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">{format(new Date(), "yyyy.MM.dd (EEE)", { locale: ko })}</span>
            </div>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-indigo-600 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" /> 오늘 진행 업무 *
              </Label>
              <textarea
                value={todayWork}
                onChange={(e) => setTodayWork(e.target.value)}
                placeholder={"- 모델 학습 데이터 전처리 완료\n- 데이터 증강 파이프라인 테스트"}
                rows={5}
                className="w-full rounded-xl border border-gray-200 p-3 font-mono text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-amber-600 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> 특이사항 <span className="text-xs font-normal text-gray-400">(선택)</span>
              </Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="- 특이사항이 있으면 작성해주세요"
                rows={3}
                className="w-full rounded-xl border border-gray-200 p-3 font-mono text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-emerald-600 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 내일 예정업무
              </Label>
              <textarea
                value={tomorrowWork}
                onChange={(e) => setTomorrowWork(e.target.value)}
                placeholder="- 내일 할 일을 작성해주세요"
                rows={3}
                className="w-full rounded-xl border border-gray-200 p-3 font-mono text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>취소</Button>
              <Button type="submit" disabled={createWorkLog.isPending}>작성 완료</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 상세 모달 */}
      <Dialog open={!!detailLog} onOpenChange={() => { setDetailLog(null); setIsEditing(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" showCloseButton={false}>
          {detailLog && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br text-sm font-bold text-white", colorClass(detailLog.author))}>
                      {getMemberName(detailLog.author)[0]}
                    </div>
                    <div>
                      <DialogTitle>{getMemberName(detailLog.author)}</DialogTitle>
                      <p className="text-sm text-gray-400">{detailLog.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {detailLog.author === userEmail && !isEditing && (
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isEditing && (
                      <Button size="sm" onClick={handleUpdate} disabled={updateWorkLog.isPending}>저장</Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <Separator className="my-2" />

              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={15}
                  className="w-full rounded-xl border border-gray-200 p-4 font-mono text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <div
                  className="notice-content md-content text-sm leading-relaxed text-gray-700"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(detailLog.content) }}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
