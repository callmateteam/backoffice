"use client";

import { useState } from "react";
import { useSchedules } from "@/hooks/use-schedules";
import { ScheduleForm } from "@/components/schedule-form";
import { ScheduleDetail } from "@/components/schedule-detail";
import { TodoList } from "@/components/todo-list";
import { Schedule } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ChevronDown, ChevronRight, Search } from "lucide-react";
import { AssigneeFilter } from "@/components/assignee-filter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  todo: { label: "할 일", className: "bg-gray-100 text-gray-600" },
  "in-progress": { label: "진행 중", className: "bg-blue-50 text-blue-600" },
  done: { label: "완료", className: "bg-emerald-50 text-emerald-600" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "todo", label: "할 일" },
  { value: "in-progress", label: "진행 중" },
  { value: "done", label: "완료" },
];

export function ListView() {
  const { data: schedules = [], isLoading } = useSchedules();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const assignees = [...new Set(schedules.map((s) => s.assignee).filter(Boolean))];

  const filtered = schedules.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (assigneeFilter !== "all" && s.assignee !== assigneeFilter) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MM.dd HH:mm", { locale: ko });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-gray-200 pl-9 sm:w-60"
            />
          </div>
          <div className="flex rounded-xl border border-gray-200 bg-white p-0.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all sm:flex-none",
                  statusFilter === opt.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <Button
          className="w-full rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 sm:w-auto"
          onClick={() => { setSelectedSchedule(null); setFormOpen(true); }}
        >
          <Plus className="mr-2 h-4 w-4" />
          새 일정
        </Button>
      </div>

      <AssigneeFilter assignees={assignees} selected={assigneeFilter} onChange={setAssigneeFilter} />

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="min-w-150">
        <div className="grid grid-cols-[32px_1fr_80px_140px_140px] gap-2 border-b border-gray-100 bg-gray-50/50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <div />
          <div>제목</div>
          <div>상태</div>
          <div>기간</div>
          <div>담당자</div>
        </div>

        {filtered.map((schedule) => {
          const statusInfo = STATUS_CONFIG[schedule.status] || STATUS_CONFIG.todo;
          const isExpanded = expandedIds.has(schedule.id);

          return (
            <div key={schedule.id} className="border-b border-gray-50 last:border-b-0">
              <div className="grid grid-cols-[32px_1fr_80px_140px_140px] gap-2 items-center px-4 py-3 transition-colors hover:bg-gray-50/50">
                <button
                  onClick={() => toggleExpand(schedule.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
                <div
                  className="flex items-center gap-2.5 cursor-pointer min-w-0"
                  onClick={() => {
                    setSelectedSchedule(schedule);
                    setDetailOpen(true);
                  }}
                >
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: schedule.color }}
                  />
                  <span className="truncate text-sm font-medium text-gray-800">{schedule.title}</span>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                    statusInfo.className
                  )}
                >
                  {statusInfo.label}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDate(schedule.startDate)} ~ {formatDate(schedule.endDate)}
                </span>
                <span className="truncate text-xs text-gray-400">
                  {schedule.assignee}
                </span>
              </div>

              {isExpanded && (
                <div className="border-t border-dashed border-gray-100 bg-gray-50/30 px-12 py-3">
                  <TodoList scheduleId={schedule.id} />
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
              <Search className="h-5 w-5 text-gray-300" />
            </div>
            <p className="mt-3 text-sm text-gray-400">일정이 없습니다</p>
          </div>
        )}
        </div>
      </div>

      <ScheduleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        schedule={selectedSchedule}
      />
      <ScheduleDetail
        schedule={selectedSchedule}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
