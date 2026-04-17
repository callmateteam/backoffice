"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { NoticesContent } from "@/app/notices/page";
import { MeetingsContent } from "@/app/meetings/page";
import { WorkLogsContent } from "@/app/worklogs/page";
import { Megaphone, FileText, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "notices" | "meetings" | "worklogs";

const TABS: { value: Tab; label: string; icon: typeof Megaphone }[] = [
  { value: "notices", label: "공지사항", icon: Megaphone },
  { value: "meetings", label: "회의록", icon: FileText },
  { value: "worklogs", label: "업무일지", icon: ClipboardList },
];

export default function TeamPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return <TeamContent userEmail={session.user?.email || ""} />;
}

function TeamContent({ userEmail }: { userEmail: string }) {
  const [tab, setTab] = useState<Tab>("notices");

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">팀</h1>
            <p className="mt-1 text-sm text-gray-500">
              {tab === "notices" && "팀 공지사항을 확인하세요"}
              {tab === "meetings" && "회의록을 관리하세요"}
              {tab === "worklogs" && "업무일지를 확인하세요"}
            </p>
          </div>

          <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {TABS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setTab(option.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                    tab === option.value
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

        {tab === "notices" && <NoticesContent userEmail={userEmail} embedded />}
        {tab === "meetings" && <MeetingsContent embedded />}
        {tab === "worklogs" && <WorkLogsContent userEmail={userEmail} embedded />}
      </main>
    </>
  );
}
