"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useSchedules } from "@/hooks/use-schedules";
import { Navbar } from "@/components/navbar";
import { ScheduleDetail } from "@/components/schedule-detail";
import { Schedule } from "@/types";
import { CalendarDays, CheckCircle2, Clock, ListTodo, ArrowRight } from "lucide-react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  todo: "할 일",
  "in-progress": "진행 중",
  done: "완료",
};

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

  const stats = [
    { label: "전체 일정", value: schedules.length, icon: CalendarDays, color: "from-indigo-500 to-indigo-600", bg: "bg-indigo-50", text: "text-indigo-600" },
    { label: "할 일", value: todoCount, icon: ListTodo, color: "from-amber-500 to-orange-500", bg: "bg-amber-50", text: "text-amber-600" },
    { label: "진행 중", value: inProgressCount, icon: Clock, color: "from-blue-500 to-cyan-500", bg: "bg-blue-50", text: "text-blue-600" },
    { label: "완료", value: doneCount, icon: CheckCircle2, color: "from-emerald-500 to-green-500", bg: "bg-emerald-50", text: "text-emerald-600" },
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {isLoading ? (
          <div className="flex h-96 items-center justify-center text-muted-foreground">
            로딩 중...
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
              <p className="mt-1 text-sm text-gray-500">일정 현황을 한눈에 확인하세요</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", stat.bg)}>
                        <Icon className={cn("h-6 w-6", stat.text)} />
                      </div>
                    </div>
                    <div className={cn("absolute bottom-0 left-0 h-1 w-full bg-linear-to-r", stat.color)} />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
                  <h2 className="font-semibold text-gray-900">오늘 일정</h2>
                  <Link href="/calendar" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    전체보기 <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="p-4">
                  {todaySchedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                        <CalendarDays className="h-5 w-5 text-gray-300" />
                      </div>
                      <p className="mt-3 text-sm text-gray-400">오늘 일정이 없습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {todaySchedules.map((s) => (
                        <div
                          key={s.id}
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50"
                          onClick={() => { setSelectedSchedule(s); setDetailOpen(true); }}
                        >
                          <div className="h-2.5 w-2.5 rounded-full ring-4 ring-white" style={{ backgroundColor: s.color }} />
                          <span className="flex-1 text-sm font-medium text-gray-700">{s.title}</span>
                          <span className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            s.status === "done" ? "bg-emerald-50 text-emerald-600" :
                            s.status === "in-progress" ? "bg-blue-50 text-blue-600" :
                            "bg-gray-100 text-gray-500"
                          )}>
                            {STATUS_LABELS[s.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
                  <h2 className="font-semibold text-gray-900">다가오는 일정</h2>
                  <Link href="/list" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    전체보기 <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="p-4">
                  {upcomingSchedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                        <Clock className="h-5 w-5 text-gray-300" />
                      </div>
                      <p className="mt-3 text-sm text-gray-400">예정된 일정이 없습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {upcomingSchedules.map((s) => (
                        <div
                          key={s.id}
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50"
                          onClick={() => { setSelectedSchedule(s); setDetailOpen(true); }}
                        >
                          <div className="h-2.5 w-2.5 rounded-full ring-4 ring-white" style={{ backgroundColor: s.color }} />
                          <span className="flex-1 text-sm font-medium text-gray-700">{s.title}</span>
                          <span className="text-xs font-medium text-gray-400">
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
                </div>
              </div>
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
