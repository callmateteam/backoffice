"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useSchedules } from "@/hooks/use-schedules";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2, Clock, ListTodo } from "lucide-react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";
import { ScheduleDetail } from "@/components/schedule-detail";
import { Schedule } from "@/types";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { data: schedules = [], isLoading } = useSchedules();
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (status === "loading") return null;
  if (!session) redirect("/login");

  const todoCount = schedules.filter((s) => s.status === "todo").length;
  const inProgressCount = schedules.filter((s) => s.status === "in-progress").length;
  const doneCount = schedules.filter((s) => s.status === "done").length;

  const todaySchedules = schedules.filter((s) => {
    try { return isToday(parseISO(s.startDate)); } catch { return false; }
  });

  const upcomingSchedules = schedules
    .filter((s) => {
      try {
        const d = parseISO(s.startDate);
        return d > new Date() && s.status !== "done";
      } catch { return false; }
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {isLoading ? (
          <div className="flex h-96 items-center justify-center text-muted-foreground">
            로딩 중...
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">대시보드</h1>

            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">전체</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{schedules.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">할 일</CardTitle>
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todoCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">진행 중</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">완료</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{doneCount}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">오늘 일정</CardTitle>
                </CardHeader>
                <CardContent>
                  {todaySchedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">오늘 일정이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {todaySchedules.map((s) => (
                        <div
                          key={s.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-gray-50"
                          onClick={() => { setSelectedSchedule(s); setDetailOpen(true); }}
                        >
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="flex-1 text-sm">{s.title}</span>
                          <Badge variant={s.status === "done" ? "default" : "outline"} className="text-xs">
                            {s.status === "todo" ? "할 일" : s.status === "in-progress" ? "진행 중" : "완료"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">다가오는 일정</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingSchedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">예정된 일정이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {upcomingSchedules.map((s) => (
                        <div
                          key={s.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-gray-50"
                          onClick={() => { setSelectedSchedule(s); setDetailOpen(true); }}
                        >
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="flex-1 text-sm">{s.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {(() => {
                              try {
                                const d = parseISO(s.startDate);
                                if (isTomorrow(d)) return "내일";
                                return format(d, "M.d (EEE)", { locale: ko });
                              } catch { return ""; }
                            })()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <ScheduleDetail
        schedule={selectedSchedule}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
