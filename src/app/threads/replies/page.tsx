"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useThreadReplies } from "@/hooks/use-threads";
import { ArrowLeft, ExternalLink, MessageCircle, User } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

export default function ThreadsRepliesPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session) redirect("/login");

  return <RepliesContent />;
}

function RepliesContent() {
  const { data: replies = [], isLoading } = useThreadReplies();

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MM.dd (EEE) HH:mm", { locale: ko });
    } catch {
      return dateStr;
    }
  };

  // Group replies by original post
  const grouped = replies.reduce(
    (acc, reply) => {
      const key = reply.originalPost || "기타";
      if (!acc[key]) acc[key] = { url: reply.originalUrl, replies: [] };
      acc[key].replies.push(reply);
      return acc;
    },
    {} as Record<string, { url: string | null; replies: typeof replies }>
  );

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/threads">
              <Button variant="ghost" size="sm" className="rounded-xl">
                <ArrowLeft className="mr-1 h-4 w-4" />
                돌아가기
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Threads 댓글</h1>
              <p className="mt-1 text-sm text-gray-500">
                {replies.length}개의 댓글이 수집됨
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-96 items-center justify-center text-gray-400">
            로딩 중...
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
              <MessageCircle className="h-6 w-6 text-gray-300" />
            </div>
            <p className="mt-4 text-sm text-gray-400">수집된 댓글이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([postTitle, { url, replies: postReplies }]) => (
              <div
                key={postTitle}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
              >
                {/* Original Post Header */}
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 line-clamp-1">
                      {postTitle}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-500">
                        {postReplies.length}개 댓글
                      </span>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-rose-500"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                <div className="divide-y divide-gray-50">
                  {postReplies.map((reply) => (
                    <div key={reply.id} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-rose-100 to-fuchsia-100">
                          <User className="h-4 w-4 text-rose-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              @{reply.username}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(reply.timestamp || reply.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
