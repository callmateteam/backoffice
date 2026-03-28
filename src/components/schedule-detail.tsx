"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TodoList } from "@/components/todo-list";
import { ScheduleForm } from "@/components/schedule-form";
import { useDeleteSchedule } from "@/hooks/use-schedules";
import { Schedule } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Pencil, Trash2, Calendar, User } from "lucide-react";
import { getMemberName } from "@/lib/members";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  todo: { label: "할 일", className: "bg-gray-100 text-gray-600" },
  "in-progress": { label: "진행 중", className: "bg-blue-50 text-blue-600" },
  done: { label: "완료", className: "bg-emerald-50 text-emerald-600" },
};

interface ScheduleDetailProps {
  schedule: Schedule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleDetail({
  schedule,
  open,
  onOpenChange,
}: ScheduleDetailProps) {
  const [editOpen, setEditOpen] = useState(false);
  const deleteSchedule = useDeleteSchedule();

  if (!schedule) return null;

  const statusInfo = STATUS_CONFIG[schedule.status] || STATUS_CONFIG.todo;

  const handleDelete = async () => {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    try {
      await deleteSchedule.mutateAsync(schedule.id);
      toast.success("일정이 삭제되었습니다.");
      onOpenChange(false);
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: schedule.color }}
              />
              <DialogTitle className="text-left text-lg flex-1">
                {schedule.title}
              </DialogTitle>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  title="수정"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteSchedule.isPending}
                  title="삭제"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="space-y-3">
              <span
                className={cn(
                  "inline-block rounded-full px-3 py-1 text-xs font-medium",
                  statusInfo.className
                )}
              >
                {statusInfo.label}
              </span>

              {schedule.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {schedule.description}
                </p>
              )}

              <div className="space-y-2 rounded-xl bg-gray-50/80 p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <div>{formatDate(schedule.startDate)}</div>
                    <div className="text-muted-foreground">~ {formatDate(schedule.endDate)}</div>
                  </div>
                </div>
                {schedule.assignee && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{getMemberName(schedule.assignee)}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <TodoList scheduleId={schedule.id} />
          </div>
        </DialogContent>
      </Dialog>

      <ScheduleForm
        open={editOpen}
        onOpenChange={setEditOpen}
        schedule={schedule}
      />
    </>
  );
}
