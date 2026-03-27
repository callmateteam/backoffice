"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { CalendarView } from "@/components/calendar-view";

export default function CalendarPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">캘린더</h1>
          <p className="mt-1 text-sm text-gray-500">월간/주간 일정을 확인하세요</p>
        </div>
        <CalendarView />
      </main>
    </>
  );
}
