import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  // Check token info from Google
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${session.accessToken}`
  );
  const tokenInfo = await res.json();

  return NextResponse.json({
    user: session.user?.email,
    tokenInfo,
  });
}
