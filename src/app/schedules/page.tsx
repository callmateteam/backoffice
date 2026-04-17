"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { BoardView } from "@/components/board-view";
import { ListView } from "@/components/list-view";
import { CalendarView } from "@/components/calendar-view";
import { LayoutGrid, List, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "board" | "list" | "calendar";

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { value: "board", label: "보드", icon: LayoutGrid },
  { value: "list", label: "리스트", icon: List },
  { value: "calendar", label: "캘린더", icon: CalendarDays },
];

export default function SchedulesPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return <SchedulesContent />;
}

function SchedulesContent() {
  const [view, setView] = useState<ViewMode>("board");

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">일정 관리</h1>
            <p className="mt-1 text-sm text-gray-500">
              {view === "board" && "드래그앤드롭으로 상태를 변경하세요"}
              {view === "list" && "일정을 목록으로 관리하세요"}
              {view === "calendar" && "캘린더에서 일정을 확인하세요"}
            </p>
          </div>

          {/* View Selector */}
          <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setView(option.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                    view === option.value
                      ? "bg-rose-50 text-rose-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {view === "board" && <BoardView />}
        {view === "list" && <ListView />}
        {view === "calendar" && <CalendarView />}
      </main>
    </>
  );
}
