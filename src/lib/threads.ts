const BASE_URL = "https://graph.threads.net/v1.0";

const THREADS_USER_ID = process.env.THREADS_USER_ID!;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN!;
const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const THREADS_DB = process.env.NOTION_THREADS_DB!;
const REPLIES_DB = process.env.NOTION_REPLIES_DB!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const DISCORD_THREADS_WEBHOOK = process.env.DISCORD_THREADS_WEBHOOK_URL || "";

const NOTION_API = "https://api.notion.com/v1";
const notionHeaders = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28",
};

// --- Post Types & Topics ---

const POST_TYPES = [
  "공감형", "고백형", "반전형", "인사이트형", "논쟁형",
  "질문형", "미시서사형", "MBTI형", "아무도안말하는형", "관점전환형",
] as const;

const TOPICS = [
  "매출", "손님 응대", "직원 관리", "임대료", "배달앱",
  "인스타 마케팅", "단골", "폐업 고민", "창업 초기", "세금/부가세",
  "혼자 운영", "가족 장사", "프랜차이즈 vs 개인", "시즌/성수기", "새벽 준비",
  "마감 후 감정", "리뷰 관리", "원가 계산", "경쟁 매장", "자영업자 멘탈",
];

const TEMPLATE_INSTRUCTIONS: Record<string, string> = {
  공감형: `[극도로 구체적인 소상공인 일상 상황]을 묘사하고, 그 순간의 예상치 못한 감정/생각을 표현해요.
마지막은 "이거 저만 그래요?" 또는 비슷한 공감 유도 질문으로 끝내세요.`,
  고백형: `소상공인으로서 솔직히 말하기 민망하지만 공감가는 사실을 고백하는 글을 써요.
"솔직히 고백하면,"으로 시작하고, 약간의 자조와 따뜻함을 담아주세요.`,
  반전형: `진지하거나 인상적인 셋업을 1-2줄 쓴 뒤, 줄바꿈 후 기대를 뒤엎는 한 줄 펀치라인으로 마무리해요.`,
  인사이트형: `소상공인이라면 누구나 믿고 있는 일반적 믿음을 깨는 반직관적 발견을 공유해요.
"실제로 [기간] 해보니까"를 포함하세요.`,
  논쟁형: `소상공인 사이에서 40% 동의 / 40% 부동의할 만한 의견을 제시해요.
1문장 개인 근거를 덧붙이세요.`,
  질문형: `소상공인 대부분이 겪는 상황을 제시하고 "어떻게 해요?"라고 물어요.
반드시 본인의 답을 먼저 공유하세요.`,
  미시서사형: `소상공인의 하루에서 가져온 짧은 완결형 이야기를 써요.
교훈 없음. 설명 없음. 콜투액션 없음.`,
  MBTI형: `특정 MBTI 유형의 사장님들만 공감할 초구체적 경험 3가지를 리스트업해요.
마지막에 "맞아요?"로 끝내세요.`,
  아무도안말하는형: `소상공인 세계에서 다들 알지만 아무도 공개적으로 말 안 하는 것을 꺼내요.
"왜 다들 이건 넘어가는 걸까요."로 마무리하세요.`,
  관점전환형: `과거에 믿었던 것과 경험 후 달라진 현재 믿음을 대비해요.
답이 없는 열린 질문으로 끝내세요.`,
};

const SYSTEM_PROMPT = `당신은 소상공인 사장님들을 가까이서 만나고 지켜보는 사람입니다. 사장님은 아니지만, 주변에 자영업 하는 분들이 많아서 그분들의 고민과 현실을 잘 알고 있어요.

당신의 목표는 Threads에서 소상공인 사장님들이 "아 맞아, 이거 진짜 그래" 하면서 자기 이야기를 답글로 꺼내게 만드는 거예요.

글쓰기 규칙:
- 해요체 사용 (따뜻하고 솔직하게)
- 반말(X), 합쇼체(X)
- 500자 이하 엄수
- 이모지 최대 1-2개
- 외부 링크 절대 포함 금지
- 홍보/광고/서비스 소개 절대 금지
- 마지막은 반드시 열린 구조로 끝내기
- 줄바꿈을 활용해서 가독성 확보
- "잖아요", "그렇지 않아요?" 같은 공감 유도 어미 활용
- 초구체적이고 현실적인 상황 묘사
- 해시태그 사용하지 않기
- "주변 사장님이 이러시더라" 같은 3인칭 관찰자 시점
- 직접 사장님인 척 하지 않기
- 마지막에 사장님들한테 직접 물어보는 구조

글만 출력하세요. 제목, 설명, 따옴표 없이 본문만 작성하세요.`;

// --- Notion Helpers ---

async function queryNotionDb(dbId: string, filter?: any, sorts?: any[], pageSize?: number): Promise<any[]> {
  const body: any = {};
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;
  if (pageSize) body.page_size = pageSize;

  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: "POST",
    headers: notionHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion query failed: ${await res.text()}`);
  return ((await res.json()) as any).results || [];
}

async function createNotionPage(dbId: string, properties: any): Promise<string> {
  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: notionHeaders,
    body: JSON.stringify({ parent: { database_id: dbId }, properties }),
  });
  if (!res.ok) throw new Error(`Notion create failed: ${await res.text()}`);
  return ((await res.json()) as any).id;
}

async function updateNotionPage(pageId: string, properties: any): Promise<void> {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: "PATCH",
    headers: notionHeaders,
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
  const recent = await queryNotionDb(THREADS_DB, undefined,
    [{ timestamp: "created_time", direction: "descending" }], 6);
  const recentTypes = recent.slice(0, 2).map((p: any) => getText(p.properties["유형"]));
  const recentContents = recent.slice(0, 3).map((p: any) => getText(p.properties["본문"]));

  // Pick 2 different types
  const available = POST_TYPES.filter(t => !recentTypes.includes(t));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const types = [shuffled[0], shuffled[1]];

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
    await createNotionPage(THREADS_DB, {
      제목: { title: [{ text: { content: `[${type}] ${preview}...` } }] },
      본문: { rich_text: [{ text: { content } }] },
      유형: { select: { name: type } },
      상태: { select: { name: "초안" } },
    });

    recentContents.unshift(content);
    count++;
  }

  return { count };
}

async function callGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${GEMINI_API_KEY}`;
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
  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) return { published: 0 };

  const pages = await queryNotionDb(THREADS_DB, {
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
      const createRes = await fetch(`${BASE_URL}/${THREADS_USER_ID}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "TEXT", text: content, access_token: THREADS_ACCESS_TOKEN,
        }),
      });
      if (!createRes.ok) throw new Error(await createRes.text());
      const { id: containerId } = await createRes.json();

      // Publish container
      const pubRes = await fetch(`${BASE_URL}/${THREADS_USER_ID}/threads_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId, access_token: THREADS_ACCESS_TOKEN,
        }),
      });
      if (!pubRes.ok) throw new Error(await pubRes.text());
      const { id: postId } = await pubRes.json();

      // Get permalink
      const linkRes = await fetch(
        `${BASE_URL}/${postId}?fields=permalink&access_token=${THREADS_ACCESS_TOKEN}`
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
      if (DISCORD_THREADS_WEBHOOK) {
        await fetch(DISCORD_THREADS_WEBHOOK, {
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
  const existing = await queryNotionDb(REPLIES_DB, {
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

    await createNotionPage(REPLIES_DB, {
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
      `${BASE_URL}/${reply.id}/replies?fields=id,text,username,timestamp&access_token=${THREADS_ACCESS_TOKEN}`
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
  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) return { collected: 0 };

  const published = await queryNotionDb(THREADS_DB, {
    property: "상태", select: { equals: "발행완료" },
  });

  const postsRes = await fetch(
    `${BASE_URL}/${THREADS_USER_ID}/threads?fields=id,text,permalink&access_token=${THREADS_ACCESS_TOKEN}&limit=50`
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
        `${BASE_URL}/${threadsPost.id}/replies?fields=id,text,username,timestamp&access_token=${THREADS_ACCESS_TOKEN}`
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
  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) return { success: false };

  // Create reply container
  const createRes = await fetch(`${BASE_URL}/${THREADS_USER_ID}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "TEXT",
      text: replyText,
      reply_to_id: replyToId,
      access_token: THREADS_ACCESS_TOKEN,
    }),
  });
  if (!createRes.ok) throw new Error(await createRes.text());
  const { id: containerId } = await createRes.json();

  // Publish
  const pubRes = await fetch(`${BASE_URL}/${THREADS_USER_ID}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: THREADS_ACCESS_TOKEN,
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
  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) return { synced: 0 };

  const postsRes = await fetch(
    `${BASE_URL}/${THREADS_USER_ID}/threads?fields=id,text,timestamp,permalink&access_token=${THREADS_ACCESS_TOKEN}&limit=20`
  );
  if (!postsRes.ok) return { synced: 0 };
  const postsData = await postsRes.json();
  const posts = postsData.data || [];

  let synced = 0;
  for (const post of posts) {
    if (!post.permalink) continue;

    const existing = await queryNotionDb(THREADS_DB, {
      property: "Threads URL", url: { equals: post.permalink },
    }, undefined, 1);
    if (existing.length > 0) continue;

    const preview = (post.text || "").slice(0, 15).replace(/\n/g, " ");
    await createNotionPage(THREADS_DB, {
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
