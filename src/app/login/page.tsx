"use client";

import { signIn, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const { data: session } = useSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">백오피스</CardTitle>
          <p className="text-sm text-muted-foreground">
            일정관리 시스템에 로그인하세요
          </p>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            Google로 로그인
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
