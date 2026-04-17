const BASE_URL = "https://graph.threads.net/v1.0";
const NOTION_API = "https://api.notion.com/v1";

const env = {
  get userId() { return process.env.THREADS_USER_ID || ""; },
  get accessToken() { return process.env.THREADS_ACCESS_TOKEN || ""; },
  get notionToken() { return process.env.NOTION_TOKEN || ""; },
  get threadsDb() { return process.env.NOTION_THREADS_DB || ""; },
  get repliesDb() { return process.env.NOTION_REPLIES_DB || ""; },
  get geminiKey() { return process.env.GEMINI_API_KEY || ""; },
  get discordWebhook() { return process.env.DISCORD_THREADS_WEBHOOK_URL || ""; },
};

function notionHeaders() {
  return {
    Authorization: `Bearer ${env.notionToken}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };
}

// --- Post Types & Topics ---

const POST_TYPES = [
  "오늘의썰형", "숫자해부형", "전후대비형", "공감형", "실패서사형",
  "플랫폼인질형", "아무도안말하는형", "반전형", "질문형", "관점전환형",
] as const;

const TOPICS = [
  "매출", "손님 응대", "직원 관리", "임대료", "배달앱 수수료",
  "인스타 마케팅", "단골", "폐업 고민", "창업 초기", "세금/부가세",
  "혼자 운영", "가족 장사", "프랜차이즈 vs 개인", "시즌/성수기", "새벽 준비",
  "마감 후 감정", "리뷰 관리", "원가 계산", "경쟁 매장", "자영업자 멘탈",
  "플랫폼 의존도", "실제 수익 구조", "첫 직원 고용", "가격 결정",
  "사업자등록 전후", "직원일 때 vs 사장일 때", "창업 N년차 현실",
];

const TEMPLATE_INSTRUCTIONS: Record<string, string> = {
  오늘의썰형: `오늘 소상공인 사장님과 대화하면서 들은 이야기를 풀어요.
"오늘 사장님 한 분이랑 얘기했는데," 또는 "오늘 미팅에서 들은 이야기가 계속 머릿속에 남아요." 같은 도입.
사장님의 구체적인 상황과 말씀을 전달하고, 그 말이 왜 마음에 남았는지 감정을 담아요.
교훈은 절대 명시하지 말고, 마지막에 열린 질문으로 끝내세요.`,
  숫자해부형: `구체적인 매출/비용 숫자를 보여주고 실제로 남는 금액의 충격을 전달해요.
"아는 사장님 케이스"로 프레이밍하세요.
"- [비용항목]: X만원" 리스트 형태로 뜯어보여주고,
마지막에 "그래도 계속하시더라고요. 왜 그럴까요, 사장님들은요?"로 끝내세요.
숫자는 반드시 구체적으로 (월매출 800만원, 임대료 180만원 등).`,
  전후대비형: `직원이었을 때 사장님 행동을 오해했던 것과, 사장 입장을 알고 나서 달라진 해석을 대비해요.
"직원일 때:" / "사장 되고 나서:" 구조로 나누세요.
"아는 사장님이 예전에 직장 다닐 때는~" 같은 도입.
교훈 절대 명시하지 말고 독자가 느끼게 두세요.`,
  공감형: `소상공인 AI를 만들면서 들은 구체적인 에피소드를 전달해요.
"소상공인 사장님들 AI로 도와드리는 서비스 만들고 있는데," 같은 자연스러운 도입 후,
사장님이 하신 말씀 중 마음에 남는 한마디를 중심으로 풀어요.
마지막은 "사장님들은 어떠세요?" 또는 "다들 이러시나요?"로 끝내세요.`,
  실패서사형: `주변 사장님의 실패 경험을 담담하게 전달해요.
구체적 타임라인("창업 2년차 3월"), 구체적 숫자("통장 잔고 340만원")를 포함하세요.
성공으로 반전시키지 마세요. 담담한 현실 그대로.
마지막에 "(아마도요.)" 같은 불확실한 마무리로 여운을 남기세요.`,
  플랫폼인질형: `배달앱, 네이버, 인스타 등 플랫폼 의존 문제를 꺼내요.
"아는 사장님이 그러시더라고요. [플랫폼] 없으면 당장 내일 장사 못 한다고."
플랫폼이 수수료 올리면/정책 바꾸면 어쩔 건지 질문을 던지세요.
사장님들의 대비 방법을 물어보는 구조로 끝내세요.`,
  아무도안말하는형: `소상공인 세계에서 다들 알지만 아무도 공개적으로 말 안 하는 것을 꺼내요.
"소상공인 사장님들 만나면서 느낀 건데, 이건 아무도 안 말해주더라고요."
2-3문장으로 핵심을 짚고, "왜 다들 이건 넘어가는 걸까요."로 마무리하세요.`,
  반전형: `진지하거나 인상적인 셋업을 1-2줄 쓴 뒤, 줄바꿈 후 기대를 뒤엎는 한 줄 펀치라인으로 마무리해요.
소상공인/창업 맥락에서 소재를 찾으세요.
예: "아는 사장님이 월매출 1억 찍었다고 하셔서 축하한다고 했더니\\n\\n표정이 왜 그러세요 했더니 세금 고지서 보여주시더라고요."`,
  질문형: `소상공인 대부분이 겪는 상황을 제시하고 사장님들한테 물어요.
"소상공인 서비스 만들면서 궁금한 게 생겼는데," 같은 도입.
본인의 관찰이나 가설을 먼저 살짝 공유하고, "사장님들은 어떻게 하세요?"로 끝내세요.`,
  관점전환형: `소상공인 사장님이 과거에 믿었던 것과 경험 후 달라진 믿음을 전달해요.
"아는 사장님이 예전에는 [A]인 줄 아셨대요. 근데 [경험] 후에 지금은 [B]라고 하시더라고요."
마지막에 "어느 쪽이 맞는 걸까요."로 끝내세요.`,
};

const SYSTEM_PROMPT = `당신은 Threads에 글을 쓰는 사람이에요. 회사 공식 계정이 아니라 그냥 친구한테 말하듯이 쓰세요. 대기업 BBQ, KREAM, 토스 같은 브랜드들이 Threads에서 하는 방식이에요.

핵심 원칙: AI가 쓴 티가 나면 안 돼요. 공식 계정 티도 나면 안 돼요. 진짜 사람이 친구한테 말하듯이.

정체성:
- 소상공인 AI 만드는 작은 팀에서 일하는 사람
- 사장님들이랑 자주 만나서 얘기 듣는 사람
- 광고하러 온 게 아니라 그냥 겪은 거 풀어놓는 사람

말투 (가장 중요):
- 짧은 문장. 긴 설명 금지. 한 줄 or 두 줄 기본.
- 줄바꿈으로 호흡 끊기
- "~거든요", "~더라구요", "~해요" 정도의 친근한 해요체
- 가끔 "ㄹㅇ", "진심", "미쳤다" 같은 표현 써도 됨
- 의도적 오타나 줄임말 허용 ("근데" O, "그런데" X)
- "저희는~", "브랜드에서는~" 절대 금지
- 합쇼체 금지. 교과서 톤 금지.

시작 패턴 (AI 티 안 나게):
- "이거 나만 그런거야?"
- "근데 진짜 궁금한게"
- "오늘 만난 사장님이"
- "아 이거 말해도 되나"
- "솔직히 말할게요"
- 절대 금지: "안녕하세요", "여러분", "오늘은 ~에 대해"

내용 원칙:
- 구체적 숫자·상황·장면 (월매출 800만원, 새벽 5시 같은)
- 교훈/조언/정리 절대 금지. 느끼게만 두기.
- 성공 자랑 X, 실패/현실 O
- 마지막은 열린 질문 or 여운 있는 한 줄
- "(아마도요.)" 같은 불확실한 마무리 자주 활용
- 500자 이하 엄수
- 해시태그 없음, 이모지 최대 1개, 외부링크 없음

브랜드 티 안 내는 방법 (BBQ "마케팅팀 막내", KREAM 반말 스타일 참고):
- 1인칭으로 말하기. "우리 회사"가 아니라 "나".
- 홍보 멘트 절대 금지. "우리 서비스가..." X
- 밈/트렌드 재해석 OK ("황홀이 아니라 황올" 같은 언어유희)
- 기업 계정 특유의 단정한 문어체 금지. 카톡 쓰듯이.

훅 공식 (첫 문장이 전부. Marketing Skills social-content 기반):

1. 궁금증 훅: "제가 잘못 알고 있었어요, [흔한 믿음]에 대해서"
2. 스토리 훅: "지난주에, [뜻밖의 일]이 있었어요" / "하마터면 [큰 실수]할 뻔했어요"
3. 가치 훅: "[숫자]개 [것들]이 [결과]를 만들어요:" / "[흔한 실수] 그만하세요. 대신 이렇게:"
4. 반대 의견 훅: "불편한 말이지만: [도발적 주장]" / "[흔한 조언]은 틀렸어요. 왜냐면:"
5. 숫자 공개 훅: "월매출 [구체적 숫자]인데 진짜 남는 건 [작은 숫자]예요"

카피라이팅 원칙 (Marketing Skills copywriting 기반):
- 명확 > 똑똑함: 고민되면 항상 명확한 쪽
- 구체 > 모호: "시간 절약" X → "주간 리포트 4시간 → 15분" O
- 손님 언어 > 회사 언어: 리뷰·인터뷰에서 들은 말 그대로
- 한 문단에 한 생각: 한 번에 한 논지만
- "활용하다" X → "쓰다" O / "최적화" X → 구체적 결과 O
- 수동태 X → 능동태 O: "보고서가 생성됨" X → "제가 만들어요" O
- "거의", "정말", "매우" 제거
- 느낌표 금지
- 마케팅 버즈워드 금지 ("혁신적", "최적화", "스트림라인")

엔게이지먼트 원칙 (Reply Depth 극대화):
- 답글을 유도하는 질문형 마무리가 필수
- 독자가 "아 맞아 나도" 할 구체적 상황 제시
- 논쟁 가능한 가벼운 도발 OK
- 답변하기 쉬운 질문 > 큰 질문

톤 예시:
✅ "오늘 만난 사장님이 통장 잔고 340만원이라고 하시더라구요\\n\\n근데 웃으시면서 말씀하셔서 더 마음이 그랬어요"
✅ "이거 나만 그런거야?\\n\\n사장님들이랑 얘기하다 보면 다들 하나같이 그 말 하시거든요"
✅ "월매출 800인데 손에 남는 게 뭔지 알아요?\\n\\n120이에요"
❌ "소상공인 사장님 여러분, 오늘은 ~에 대해 이야기해보겠습니다"
❌ "이런 노하우를 알려드릴게요"
❌ "저희가 만들고 있는 서비스는..."
❌ "활용해보세요!", "최적화하세요!"

출력은 본문만. 제목/설명/따옴표 없이 본문만 출력하세요.`;

// --- Notion Helpers ---

async function queryNotionDb(dbId: string, filter?: any, sorts?: any[], pageSize?: number): Promise<any[]> {
  const body: any = {};
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;
  if (pageSize) body.page_size = pageSize;

  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion query failed: ${await res.text()}`);
  return ((await res.json()) as any).results || [];
}

async function createNotionPage(dbId: string, properties: any): Promise<string> {
  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({ parent: { database_id: dbId }, properties }),
  });
  if (!res.ok) throw new Error(`Notion create failed: ${await res.text()}`);
  return ((await res.json()) as any).id;
}

async function updateNotionPage(pageId: string, properties: any): Promise<void> {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: "PATCH",
    headers: notionHeaders(),
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) throw new Error(`Notion update failed: ${await res.text()}`);
}

function getText(prop: any): string {
  return prop?.rich_text?.[0]?.plain_text ?? prop?.title?.[0]?.plain_text ?? "";
}

// --- Generate ---

export async function generateDrafts(): Promise<{ count: number }> {
  // Get recent posts for rotation
  const recent = await queryNotionDb(env.threadsDb, undefined,
    [{ timestamp: "created_time", direction: "descending" }], 6);
  const recentTypes = recent.slice(0, 2).map((p: any) => getText(p.properties["유형"]));
  const recentContents = recent.slice(0, 3).map((p: any) => getText(p.properties["본문"]));

  // Pick 1 type (하루에 1개만 생성)
  const available = POST_TYPES.filter(t => !recentTypes.includes(t));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const types = [shuffled[0]];

  let count = 0;
  for (const type of types) {
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const instruction = TEMPLATE_INSTRUCTIONS[type] || "";
    const prompt = `유형: ${type}\n주제: ${topic} (소상공인/자영업자 관점)\n\n${instruction}\n\n500자 이하로 작성하세요.${
      recentContents.length > 0
        ? `\n\n최근 작성한 글 (중복 피하세요):\n${recentContents.join("\n---\n")}`
        : ""
    }`;

    const content = await callGemini(prompt);
    if (!content || content.length > 500) continue;

    const preview = content.slice(0, 15).replace(/\n/g, " ");
    await createNotionPage(env.threadsDb, {
      제목: { title: [{ text: { content: `[${type}] ${preview}...` } }] },
      본문: { rich_text: [{ text: { content } }] },
      유형: { select: { name: type } },
      상태: { select: { name: "초안" } },
    });

    recentContents.unshift(content);
    count++;

    // Discord 알림
    if (env.discordWebhook) {
      await fetch(env.discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "Threads 초안 생성됨",
            color: 0x7c3aed,
            fields: [
              { name: "유형", value: type, inline: true },
              { name: "주제", value: topic, inline: true },
              { name: "글자수", value: `${content.length}자`, inline: true },
              { name: "본문", value: content.length > 300 ? content.slice(0, 300) + "..." : content },
            ],
            footer: { text: "백오피스에서 확인 후 승인해주세요" },
            timestamp: new Date().toISOString(),
          }],
        }),
      }).catch(() => {});
    }
  }

  return { count };
}

async function callGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.geminiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) {
      // Fallback to gemma
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${env.geminiKey}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\n" + prompt }] }],
        }),
      });
      if (!fallbackRes.ok) throw new Error("Both Gemini models failed");
      const data = await fallbackRes.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  } catch (error) {
    console.error("Gemini call failed:", error);
    throw error;
  }
}

// --- Publish ---

export async function publishApproved(): Promise<{ published: number }> {
  if (!env.userId || !env.accessToken) return { published: 0 };

  const pages = await queryNotionDb(env.threadsDb, {
    property: "상태", select: { equals: "승인" },
  });

  let published = 0;
  for (const page of pages) {
    const content = getText(page.properties["본문"]);
    const title = getText(page.properties["제목"]);
    const type = getText(page.properties["유형"]);
    const scheduledAt = page.properties["예약시간"]?.date?.start;

    // Auto-assign schedule if empty
    if (!scheduledAt) {
      const now = new Date();
      const slot = published % 2 === 0 ? 12 : 13; // 21:00 or 22:30 KST
      const min = published % 2 === 0 ? 0 : 30;
      const schedDate = new Date(now);
      schedDate.setUTCHours(slot, min, 0, 0);
      if (schedDate <= now) schedDate.setUTCDate(schedDate.getUTCDate() + 1);

      await updateNotionPage(page.id, {
        예약시간: { date: { start: schedDate.toISOString() } },
      });
      continue; // Will be published on next cycle
    }

    if (new Date(scheduledAt) > new Date()) continue;

    // Publish
    await updateNotionPage(page.id, { 상태: { select: { name: "발행중" } } });

    try {
      // Create container
      const createRes = await fetch(`${BASE_URL}/${env.userId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "TEXT", text: content, access_token: env.accessToken,
        }),
      });
      if (!createRes.ok) throw new Error(await createRes.text());
      const { id: containerId } = await createRes.json();

      // Publish container
      const pubRes = await fetch(`${BASE_URL}/${env.userId}/threads_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId, access_token: env.accessToken,
        }),
      });
      if (!pubRes.ok) throw new Error(await pubRes.text());
      const { id: postId } = await pubRes.json();

      // Get permalink
      const linkRes = await fetch(
        `${BASE_URL}/${postId}?fields=permalink&access_token=${env.accessToken}`
      );
      let permalink = `threads-post-${postId}`;
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        if (linkData.permalink) permalink = linkData.permalink;
      }

      await updateNotionPage(page.id, {
        상태: { select: { name: "발행완료" } },
        "Threads URL": { url: permalink },
      });

      // Discord notification
      if (env.discordWebhook) {
        await fetch(env.discordWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [{
              title: "Threads 발행 완료",
              color: 0x00d166,
              fields: [
                { name: "유형", value: type, inline: true },
                { name: "글자수", value: `${content.length}자`, inline: true },
                { name: "본문", value: content.length > 200 ? content.slice(0, 200) + "..." : content },
                ...(permalink ? [{ name: "링크", value: permalink }] : []),
              ],
              timestamp: new Date().toISOString(),
            }],
          }),
        }).catch(() => {});
      }

      published++;
    } catch (error) {
      const retryCount = page.properties["재시도"]?.number ?? 0;
      if (retryCount >= 3) {
        await updateNotionPage(page.id, { 상태: { select: { name: "발행실패" } } });
      } else {
        await updateNotionPage(page.id, {
          상태: { select: { name: "승인" } },
          재시도: { number: retryCount + 1 },
        });
      }
      console.error("Publish failed:", error);
    }
  }

  return { published };
}

// --- AI Reply Draft ---

const REPLY_SYSTEM_PROMPT = `당신은 소상공인 사장님들을 가까이서 만나고 지켜보는 사람입니다.
Threads에서 소상공인 사장님이 댓글을 달았어요. 원본 글과 대화 흐름을 보고 따뜻하게 답글을 작성해주세요.

답글 규칙:
- 해요체 사용
- 댓글 작성자의 감정을 먼저 인정/공감
- 대화를 이어갈 수 있는 질문이나 열린 마무리
- 100자 내외로 짧게
- 홍보/광고 절대 금지
- "사장님" 호칭 사용
- 진심 어린 톤, 가식 없이

답글만 출력하세요. 따옴표, 설명 없이.`;

async function generateReplyDraft(
  originalPost: string,
  conversationFlow: string[],
  newComment: string,
  commenterUsername: string
): Promise<string> {
  const context = `원본 글:
${originalPost}

${conversationFlow.length > 0 ? `대화 흐름:\n${conversationFlow.join("\n---\n")}\n` : ""}
새로 달린 댓글 (@${commenterUsername}):
${newComment}

이 댓글에 대한 답글을 작성해주세요.`;

  try {
    return await callGemini(context);
  } catch {
    return "";
  }
}

// --- Collect Replies (with nested replies) ---

async function saveReplyIfNew(
  reply: any,
  postTitle: string,
  threadsUrl: string,
  originalPostContent: string,
  conversationFlow: string[],
  parentUsername?: string
): Promise<number> {
  let collected = 0;

  // Check if already saved
  const existing = await queryNotionDb(env.repliesDb, {
    property: "Reply ID", rich_text: { equals: reply.id },
  }, undefined, 1);

  if (existing.length === 0) {
    const prefix = parentUsername ? `↳ @${reply.username} → @${parentUsername}` : `@${reply.username}`;

    // Generate AI reply draft if the comment is NOT from us
    let draftReply = "";
    let draftStatus = "불필요";
    if (reply.username !== "themuselab.official") {
      draftReply = await generateReplyDraft(
        originalPostContent,
        conversationFlow,
        reply.text || "",
        reply.username
      );
      draftStatus = draftReply ? "초안" : "불필요";
    }

    await createNotionPage(env.repliesDb, {
      제목: { title: [{ text: { content: `${prefix}: ${(reply.text || "").slice(0, 30)}...` } }] },
      댓글내용: { rich_text: [{ text: { content: reply.text || "" } }] },
      작성자: { rich_text: [{ text: { content: reply.username || "" } }] },
      작성시간: { date: { start: reply.timestamp } },
      원본글: { rich_text: [{ text: { content: postTitle } }] },
      "원본 URL": { url: threadsUrl },
      "Reply ID": { rich_text: [{ text: { content: reply.id } }] },
      ...(draftReply ? { draftReply: { rich_text: [{ text: { content: draftReply } }] } } : {}),
      draftStatus: { select: { name: draftStatus } },
    });
    collected++;

    // Add to conversation flow for context
    conversationFlow.push(`@${reply.username}: ${reply.text}`);
    if (draftReply) {
      conversationFlow.push(`@themuselab.official (초안): ${draftReply}`);
    }
  }

  // Fetch nested replies (replies to this reply)
  try {
    const nestedRes = await fetch(
      `${BASE_URL}/${reply.id}/replies?fields=id,text,username,timestamp&access_token=${env.accessToken}`
    );
    if (nestedRes.ok) {
      const nestedData = await nestedRes.json();
      const nestedReplies = nestedData.data || [];
      for (const nested of nestedReplies) {
        collected += await saveReplyIfNew(nested, postTitle, threadsUrl, originalPostContent, conversationFlow, reply.username);
      }
    }
  } catch {
    // Nested reply fetch failed — skip silently
  }

  return collected;
}

export async function collectReplies(): Promise<{ collected: number }> {
  if (!env.userId || !env.accessToken) return { collected: 0 };

  const published = await queryNotionDb(env.threadsDb, {
    property: "상태", select: { equals: "발행완료" },
  });

  const postsRes = await fetch(
    `${BASE_URL}/${env.userId}/threads?fields=id,text,permalink&access_token=${env.accessToken}&limit=50`
  );
  if (!postsRes.ok) return { collected: 0 };
  const postsData = await postsRes.json();
  const threadsPosts = postsData.data || [];

  let collected = 0;

  for (const post of published) {
    const threadsUrl = post.properties["Threads URL"]?.url;
    if (!threadsUrl) continue;

    const threadsPost = threadsPosts.find((p: any) => p.permalink === threadsUrl);
    if (!threadsPost) continue;

    try {
      const repliesRes = await fetch(
        `${BASE_URL}/${threadsPost.id}/replies?fields=id,text,username,timestamp&access_token=${env.accessToken}`
      );
      if (!repliesRes.ok) continue;
      const repliesData = await repliesRes.json();
      const replies = repliesData.data || [];

      const postTitle = getText(post.properties["제목"]);
      const postContent = getText(post.properties["본문"]);
      const conversationFlow: string[] = [];
      for (const reply of replies) {
        collected += await saveReplyIfNew(reply, postTitle, threadsUrl, postContent, conversationFlow);
      }
    } catch {
      continue;
    }
  }

  return { collected };
}

// --- Publish Reply ---

export async function publishReply(replyPageId: string, replyText: string, replyToId: string): Promise<{ success: boolean }> {
  if (!env.userId || !env.accessToken) return { success: false };

  // Create reply container
  const createRes = await fetch(`${BASE_URL}/${env.userId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "TEXT",
      text: replyText,
      reply_to_id: replyToId,
      access_token: env.accessToken,
    }),
  });
  if (!createRes.ok) throw new Error(await createRes.text());
  const { id: containerId } = await createRes.json();

  // Publish
  const pubRes = await fetch(`${BASE_URL}/${env.userId}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: env.accessToken,
    }),
  });
  if (!pubRes.ok) throw new Error(await pubRes.text());

  // Update Notion status
  await updateNotionPage(replyPageId, {
    draftStatus: { select: { name: "발행완료" } },
    draftReply: { rich_text: [{ text: { content: replyText } }] },
  });

  return { success: true };
}

// --- Sync Manual Posts ---

export async function syncThreadsPosts(): Promise<{ synced: number }> {
  if (!env.userId || !env.accessToken) return { synced: 0 };

  const postsRes = await fetch(
    `${BASE_URL}/${env.userId}/threads?fields=id,text,timestamp,permalink&access_token=${env.accessToken}&limit=20`
  );
  if (!postsRes.ok) return { synced: 0 };
  const postsData = await postsRes.json();
  const posts = postsData.data || [];

  let synced = 0;
  for (const post of posts) {
    if (!post.permalink) continue;

    const existing = await queryNotionDb(env.threadsDb, {
      property: "Threads URL", url: { equals: post.permalink },
    }, undefined, 1);
    if (existing.length > 0) continue;

    const preview = (post.text || "").slice(0, 15).replace(/\n/g, " ");
    await createNotionPage(env.threadsDb, {
      제목: { title: [{ text: { content: `[수동] ${preview}...` } }] },
      본문: { rich_text: [{ text: { content: post.text || "" } }] },
      유형: { select: { name: "공감형" } },
      상태: { select: { name: "발행완료" } },
      "Threads URL": { url: post.permalink },
    });
    synced++;
  }

  return { synced };
}
