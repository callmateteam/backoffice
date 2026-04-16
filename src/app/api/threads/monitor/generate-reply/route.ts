import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

const REPLY_PROMPT = `당신은 소상공인 AI 서비스를 만들고 있는 사람이에요. Threads에서 다른 사장님/창업자의 글에 자연스럽게 댓글을 다는 거예요.

댓글 규칙:
- 친근한 해요체 ("~거든요", "~더라구요")
- 1~3줄 이내. 짧고 진심 어린 느낌
- 상대방 글의 맥락에 맞는 공감 or 질문
- 광고 절대 금지. 서비스 언급 금지.
- "저도 비슷한 경험이~", "이거 진짜 공감되네요" 같은 자연스러운 공감
- 필요하면 가볍게 본인 경험 한 줄 추가
- 너무 길거나 조언하는 톤 금지
- AI가 쓴 느낌 나면 안 됨
- "화이팅", "응원합니다" 같은 뻔한 마무리 금지

좋은 예:
"아 이거 진짜 공감되네요.. 저도 사장님들 만나다 보면 이 얘기 제일 많이 들어요"
"근데 진짜 이게 제일 힘든 부분인 거 같아요 ㅠ 혹시 지금은 좀 나아지셨어요?"

댓글만 출력. 설명 없이.`;

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { postText, username } = await request.json();
    if (!postText) return NextResponse.json({ error: "postText required" }, { status: 400 });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return NextResponse.json({ error: "Gemini key not set" }, { status: 500 });

    const prompt = `@${username || "상대방"}님의 글:\n"${postText}"\n\n이 글에 자연스럽게 댓글을 달아주세요.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: REPLY_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) throw new Error("Gemini failed");
    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Generate reply failed:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
