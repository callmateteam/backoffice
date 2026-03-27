"use client";

import { useState } from "react";
import { useSchedules } from "@/hooks/use-schedules";
import { ScheduleForm } from "@/components/schedule-form";
import { ScheduleDetail } from "@/components/schedule-detail";
import { TodoList } from "@/components/todo-list";
import { Schedule } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  todo: { label: "할 일", className: "bg-gray-100 text-gray-700" },
  "in-progress": { label: "진행 중", className: "bg-blue-100 text-blue-700" },
  done: { label: "완료", className: "bg-green-100 text-green-700" },
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
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filtered = schedules.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60"
          />
          <div className="flex rounded-lg border bg-white">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-gray-50",
                  opt.value === "all" && "rounded-l-lg",
                  opt.value === "done" && "rounded-r-lg"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => { setSelectedSchedule(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          새 일정
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="grid grid-cols-[32px_1fr_80px_160px_160px] gap-2 border-b bg-gray-50 px-3 py-2 text-xs font-medium text-muted-foreground">
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
            <div key={schedule.id} className="border-b last:border-b-0">
              <div className="grid grid-cols-[32px_1fr_80px_160px_160px] gap-2 items-center px-3 py-2.5 hover:bg-gray-50">
                <button
                  onClick={() => toggleExpand(schedule.id)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-gray-200"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
                <div
                  className="flex items-center gap-2 cursor-pointer min-w-0"
                  onClick={() => {
                    setSelectedSchedule(schedule);
                    setDetailOpen(true);
                  }}
                >
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: schedule.color }}
                  />
                  <span className="truncate text-sm font-medium">{schedule.title}</span>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                    statusInfo.className
                  )}
                >
                  {statusInfo.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(schedule.startDate)} ~ {formatDate(schedule.endDate)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {schedule.assignee}
                </span>
              </div>

              {isExpanded && (
                <div className="bg-gray-50/50 px-12 py-3 border-t border-dashed">
                  <TodoList scheduleId={schedule.id} />
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            일정이 없습니다.
          </div>
        )}
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
