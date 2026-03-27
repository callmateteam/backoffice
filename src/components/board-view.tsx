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
import { useTodos } from "@/hooks/use-todos";
import { ScheduleForm } from "@/components/schedule-form";
import { ScheduleDetail } from "@/components/schedule-detail";
import { Schedule, ScheduleStatus } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical } from "lucide-react";

const COLUMNS: { id: ScheduleStatus; label: string; color: string }[] = [
  { id: "todo", label: "할 일", color: "bg-gray-100" },
  { id: "in-progress", label: "진행 중", color: "bg-blue-50" },
  { id: "done", label: "완료", color: "bg-green-50" },
];

function ScheduleCard({
  schedule,
  onClick,
}: {
  schedule: Schedule;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: schedule.color }}
              />
              <p className="truncate text-sm font-medium">{schedule.title}</p>
            </div>
            {schedule.description && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {schedule.description}
              </p>
            )}
            {schedule.assignee && (
              <p className="mt-1 text-xs text-muted-foreground">
                {schedule.assignee}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BoardView() {
  const { data: schedules = [], isLoading } = useSchedules();
  const updateSchedule = useUpdateSchedule();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );
  const [activeId, setActiveId] = useState<string | null>(null);

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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
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
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const items = schedules.filter((s) => s.status === col.id);
            return (
              <div
                key={col.id}
                id={col.id}
                className={`min-h-[400px] rounded-lg ${col.color} p-3`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="space-y-2">
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
