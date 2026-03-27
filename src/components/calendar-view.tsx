"use client";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useSchedules } from "@/hooks/use-schedules";
import { ScheduleForm } from "@/components/schedule-form";
import { ScheduleDetail } from "@/components/schedule-detail";
import { Schedule } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function CalendarView() {
  const { data: schedules = [], isLoading } = useSchedules();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");

  const events = schedules.map((s) => ({
    id: s.id,
    title: s.title,
    start: s.startDate.split("T")[0],
    end: s.endDate.split("T")[0],
    backgroundColor: s.color,
    borderColor: s.color,
    textColor: "#ffffff",
    display: "block",
    extendedProps: { schedule: s },
  }));

  const handleDateClick = (info: { dateStr: string }) => {
    setSelectedSchedule(null);
    setDefaultDate(info.dateStr + "T09:00");
    setFormOpen(true);
  };

  const handleEventClick = (info: { event: { extendedProps: Record<string, unknown> } }) => {
    setSelectedSchedule(info.event.extendedProps.schedule as Schedule);
    setDetailOpen(true);
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
      <div className="flex justify-end">
        <Button onClick={() => { setSelectedSchedule(null); setDefaultDate(""); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          새 일정
        </Button>
      </div>

      <div className="calendar-wrapper rounded-lg border bg-white p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ko"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          dayMaxEvents={4}
          eventDisplay="block"
          displayEventTime={false}
          buttonText={{
            today: "오늘",
            month: "월간",
            week: "주간",
          }}
        />
      </div>

      <ScheduleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        schedule={selectedSchedule}
        defaultDate={defaultDate}
      />
      <ScheduleDetail
        schedule={selectedSchedule}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
