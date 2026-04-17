"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSchedules, useUpdateSchedule } from "@/hooks/use-schedules";
import { ScheduleForm } from "@/components/schedule-form";
import { ScheduleDetail } from "@/components/schedule-detail";
import { Schedule, ScheduleStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { AssigneeFilter } from "@/components/assignee-filter";
import { getMemberName } from "@/lib/members";
import { Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const COLUMNS: { id: ScheduleStatus; label: string; color: string; headerColor: string; count: string }[] = [
  { id: "todo", label: "할 일", color: "bg-gray-50/80", headerColor: "bg-gray-200", count: "text-gray-600" },
  { id: "in-progress", label: "진행 중", color: "bg-fuchsia-50/50", headerColor: "bg-fuchsia-400", count: "text-fuchsia-600" },
  { id: "done", label: "완료", color: "bg-emerald-50/50", headerColor: "bg-emerald-500", count: "text-emerald-600" },
];

function ScheduleCard({
  schedule,
  onClick,
}: {
  schedule: Schedule;
  onClick: () => void;
}) {
  return (
    <div
      className="group cursor-pointer rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start gap-2.5">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: schedule.color }}
            />
            <p className="truncate text-sm font-semibold text-gray-800">{schedule.title}</p>
          </div>
          {schedule.description && (
            <p className="mt-1.5 truncate text-xs text-gray-400">
              {schedule.description}
            </p>
          )}
          {schedule.assignee && (
            <div className="mt-2 flex flex-wrap gap-1">
              {schedule.assignee.split(",").filter(Boolean).map((a) => (
                <div key={a} className="flex items-center gap-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-br from-rose-300 to-fuchsia-300 text-[10px] font-medium text-white">
                    {getMemberName(a)[0]}
                  </div>
                  <span className="text-xs text-gray-400">{getMemberName(a)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BoardView() {
  const { data: schedules = [], isLoading } = useSchedules();
  const updateSchedule = useUpdateSchedule();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const assignees = [...new Set(schedules.flatMap((s) => s.assignee?.split(",") || []).filter(Boolean))];
  const filteredSchedules = assigneeFilter === "all"
    ? schedules
    : schedules.filter((s) => s.assignee?.split(",").includes(assigneeFilter));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const scheduleId = active.id as string;
    const newStatus = over.id as ScheduleStatus;
    const schedule = schedules.find((s) => s.id === scheduleId);

    if (schedule && schedule.status !== newStatus) {
      updateSchedule.mutate({ id: scheduleId, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  const activeSchedule = activeId
    ? schedules.find((s) => s.id === activeId)
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AssigneeFilter assignees={assignees} selected={assigneeFilter} onChange={setAssigneeFilter} />
      </div>

      <div className="flex justify-end">
        <Button
          className="rounded-xl bg-linear-to-r from-rose-400 to-fuchsia-400 shadow-md shadow-rose-200 hover:from-rose-500 hover:to-fuchsia-500"
          onClick={() => {
            setSelectedSchedule(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          새 일정
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = filteredSchedules.filter((s) => s.status === col.id);
            return (
              <div
                key={col.id}
                id={col.id}
                className={cn("min-h-100 rounded-2xl p-4", col.color)}
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <div className={cn("h-2.5 w-2.5 rounded-full", col.headerColor)} />
                  <h3 className="text-sm font-bold text-gray-700">{col.label}</h3>
                  <span className={cn("ml-auto rounded-full bg-white px-2.5 py-0.5 text-xs font-bold shadow-sm", col.count)}>
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {items.map((schedule) => (
                    <div key={schedule.id} id={schedule.id}>
                      <ScheduleCard
                        schedule={schedule}
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setDetailOpen(true);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeSchedule ? (
            <ScheduleCard schedule={activeSchedule} onClick={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

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
