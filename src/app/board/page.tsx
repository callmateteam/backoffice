"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { BoardView } from "@/components/board-view";

export default function BoardPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">보드</h1>
          <p className="mt-1 text-sm text-gray-500">드래그앤드롭으로 상태를 변경하세요</p>
        </div>
        <BoardView />
      </main>
    </>
  );
}
