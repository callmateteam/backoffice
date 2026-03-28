"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateSchedule, useUpdateSchedule } from "@/hooks/use-schedules";
import { Schedule, ScheduleStatus } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getMemberList } from "@/lib/members";

const COLORS = [
  { value: "#3b82f6", label: "파랑" },
  { value: "#ef4444", label: "빨강" },
  { value: "#22c55e", label: "초록" },
  { value: "#f59e0b", label: "노랑" },
  { value: "#8b5cf6", label: "보라" },
  { value: "#ec4899", label: "핑크" },
  { value: "#6b7280", label: "회색" },
];

const STATUSES: { value: ScheduleStatus; label: string }[] = [
  { value: "todo", label: "할 일" },
  { value: "in-progress", label: "진행 중" },
  { value: "done", label: "완료" },
];

interface ScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: Schedule | null;
  defaultDate?: string;
}

export function ScheduleForm({
  open,
  onOpenChange,
  schedule,
  defaultDate,
}: ScheduleFormProps) {
  const isEdit = !!schedule;
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<ScheduleStatus>("todo");
  const [color, setColor] = useState("#3b82f6");
  const [assignee, setAssignee] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(schedule?.title || "");
      setDescription(schedule?.description || "");
      setStartDate(schedule?.startDate || defaultDate || "");
      setEndDate(schedule?.endDate || defaultDate || "");
      setStatus(schedule?.status || "todo");
      setColor(schedule?.color || "#3b82f6");
      setAssignee(schedule?.assignee || "");
    }
  }, [open, schedule, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) {
      toast.error("제목, 시작일, 종료일은 필수입니다.");
      return;
    }

    try {
      if (isEdit && schedule) {
        await updateSchedule.mutateAsync({
          id: schedule.id,
          title,
          description,
          startDate,
          endDate,
          status,
          color,
          assignee,
        });
        toast.success("일정이 수정되었습니다.");
      } else {
        await createSchedule.mutateAsync({
          title,
          description,
          startDate,
          endDate,
          status,
          color,
          assignee,
        });
        toast.success("일정이 등록되었습니다.");
      }
      onOpenChange(false);
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "일정 수정" : "새 일정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목을 입력하세요"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="상세 설명 (선택)"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>시작일 *</Label>
              <Input
                type="date"
                value={startDate.split("T")[0]}
                onChange={(e) => {
                  const time = startDate.includes("T") ? startDate.split("T")[1] : "09:00";
                  setStartDate(`${e.target.value}T${time}`);
                }}
              />
              <Input
                type="time"
                value={startDate.includes("T") ? startDate.split("T")[1]?.substring(0, 5) : "09:00"}
                onChange={(e) => {
                  const date = startDate.split("T")[0];
                  setStartDate(`${date}T${e.target.value}`);
                }}
                className="mt-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>종료일 *</Label>
              <Input
                type="date"
                value={endDate.split("T")[0]}
                onChange={(e) => {
                  const time = endDate.includes("T") ? endDate.split("T")[1] : "18:00";
                  setEndDate(`${e.target.value}T${time}`);
                }}
              />
              <Input
                type="time"
                value={endDate.includes("T") ? endDate.split("T")[1]?.substring(0, 5) : "18:00"}
                onChange={(e) => {
                  const date = endDate.split("T")[0];
                  setEndDate(`${date}T${e.target.value}`);
                }}
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>상태</Label>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                    status === s.value
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                      : "border-gray-200 bg-white text-gray-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>색상</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform",
                    color === c.value
                      ? "scale-110 border-gray-900"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assignee">담당자</Label>
            <select
              id="assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">선택 안 함</option>
              {getMemberList().map((m) => (
                <option key={m.email} value={m.email}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={createSchedule.isPending || updateSchedule.isPending}
            >
              {isEdit ? "수정" : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
