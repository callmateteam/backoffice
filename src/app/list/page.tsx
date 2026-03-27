"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ListView } from "@/components/list-view";

export default function ListPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">리스트</h1>
          <p className="mt-1 text-sm text-gray-500">일정을 목록으로 관리하세요</p>
        </div>
        <ListView />
      </main>
    </>
  );
}
