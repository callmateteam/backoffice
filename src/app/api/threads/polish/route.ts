import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

const POLISH_PROMPT = `원본 글을 Threads 스타일에 맞게 살짝만 다듬어줘. 의미는 절대 바꾸지 마.

다듬기 규칙 (Marketing Skills copywriting 기반):
- 원본의 핵심 메시지와 톤 100% 유지
- 명확 > 똑똑함. 어색한 표현만 더 자연스럽게
- 긴 문장은 끊어서 줄바꿈
- 수동태 → 능동태 ("~되다" 줄이기)
- "거의", "정말", "매우", "흥미롭게도", "중요한 것은", "결론적으로" 제거
- "활용", "최적화", "혁신" 같은 버즈워드 제거
- 마케팅 버즈워드/AI 냄새 제거
- 느낌표 줄이기 (최대 1개)
- 500자 이하 유지, 이모지 최대 1개, 해시태그 없음
- 교훈/조언 톤 감지 시 제거
- "~하시더라구요", "~거든요" 같은 친근한 어미 자연스럽게 활용
- 원본이 이미 괜찮으면 거의 안 건드려도 됨

다듬은 글만 출력. 설명 없이 본문만.`;

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "No content" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: POLISH_PROMPT }] },
        contents: [{ parts: [{ text: content }] }],
      }),
    });

    if (!res.ok) throw new Error("Gemini API failed");

    const data = await res.json();
    const polished = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    return NextResponse.json({ polished });
  } catch (error) {
    console.error("Polish failed:", error);
    return NextResponse.json({ error: "Polish failed" }, { status: 500 });
  }
}
