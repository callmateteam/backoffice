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
  "데이터발견형", "오늘의썰형", "숫자해부형", "반전형", "질문형",
  "아무도안말하는형", "업종비교형", "인상MBTI형", "실전고민형", "관점전환형",
] as const;

const TOPICS = [
  "카페 광고 모델", "병원 광고 모델", "식당 상세페이지", "펫샵 광고",
  "뷰티샵 모델 선정", "헬스장 광고", "학원 홍보", "인테리어 업체 광고",
  "친근한 vs 따뜻한 인상 차이", "신뢰감 vs 전문적인 인상 차이",
  "연예인 광고 모델 패턴", "업종별 얼굴 데이터", "얼굴 인상 MBTI",
  "사장 본인 얼굴로 찍기", "직원 얼굴 쓰기", "비싼 모델 섭외",
  "상세페이지 효과", "인스타 피드 통일성", "현수막 모델", "브랜드 톤앤매너",
  "광고 효율 낮은 이유", "감으로 결정하는 문화", "데이터로 결정하기",
  "동네 가게 광고 한계", "스마트스토어 썸네일", "배달앱 프로필 사진",
  "업종 전환 시 모델 변경", "10가지 인상 점수", "45개 얼굴 특징",
];

const TEMPLATE_INSTRUCTIONS: Record<string, string> = {
  데이터발견형: `연예인 광고 모델 50명·15업종 데이터를 뜯어보다가 발견한 인상·업종 패턴을 풀어요.
"연예인 광고 50명 데이터 뜯다가 발견한 건데" 같은 도입.
10가지 인상(친근한/신뢰감/전문적인/따뜻한/세련된/활기찬/차분한/귀여운/강인한/지적인) 중 비슷해 보이지만 다른 두 개의 차이를 구체 업종으로 비교.
교훈 금지. "어느 쪽이 맞을지 스스로는 진짜 몰라요" 같은 여운으로 끝.`,
  오늘의썰형: `오늘 만난 소상공인 사장님의 광고·모델 고민을 풀어요.
"오늘 미팅한 [업종] 사장님이 그러시더라구요" 도입.
사장님 말씀 인용("제 얼굴이 카페랑 맞는지 모르겠어요" 같은 것).
마지막은 "근데 다들 감으로 찍고 있더라구요" 같은 여운.`,
  숫자해부형: `업종별 광고 모델의 인상 점수 데이터를 구체적으로 뜯어봐요.
"[업종] 광고 모델 20명 인상 점수 평균" 같이 열고,
"- 친근한 4.2 / 세련된 2.1 / 차분한 2.8" 형식으로 보여주기.
두 업종 비교하고 "같은 '친근한'이어도 업종마다 포지션이 달라요" 같은 마무리.`,
  반전형: `광고·모델 관련해서 좋아 보이는 셋업 후 반전.
예: "상세페이지 모델 비싸서 직원으로 찍으신 사장님 '매출이 더 나오더라구요' 하셔서 축하한다 했더니 '근데 왜인지 모르겠어요'"
마지막: "그래서 우리가 뜯어봤어요" 같은 한 줄.`,
  질문형: `광고 모델 선정에 대한 솔직한 질문 던지기.
"이거 사장님들 어떻게 결정하세요?" 같은 도입.
본인 가설 살짝 공유 ("본능적으로 고르시는지 아니면 기준이 있으신지").
마지막: "사장님들은 이거 어떻게 하세요?" 로 끝.`,
  아무도안말하는형: `광고·인상·업종 매칭에서 다들 알지만 공개적으로 말 안 하는 것.
"소상공인 사장님들 만나면서 느낀 건데 이건 아무도 안 말해주더라구요" 도입.
2-3문장 짚고 "왜 다들 이건 넘어가는 걸까요" 마무리.`,
  업종비교형: `같은 인상이라도 업종별로 다르게 먹히는 현실 제시.
"카페엔 친근한 / 병원엔 신뢰감 / 펫샵엔 따뜻한" 같은 매칭 대비.
왜 그런지 짧게 언급하고 "본인 업종엔 뭐가 맞을까요" 열린 질문.`,
  인상MBTI형: `10가지 인상을 MBTI처럼 재미있게 풀어서 독자가 본인 얼굴 타입 궁금하게 만들기.
"친근한(F)·신뢰감(T)·전문적인(P)·따뜻한(W)..." 같이 이니셜 붙이기.
"사장님 얼굴은 어느 타입인지 궁금하지 않아요?" 질문.`,
  실전고민형: `상세페이지·인스타 피드·현수막 모델 고르는 실전 고민을 소재로.
"상세페이지 올릴 사진 고민한 적 있으신 사장님" 같은 질문형 도입.
구체 상황·구체 숫자 (촬영비 30만원 / 연예인 200만원 / 직원 사진 0원) 제시.
마지막: 본인 경험 물어보기.`,
  관점전환형: `사장님이 감으로 결정하다가 데이터 보고 바뀐 경험을 전달.
"예전엔 [감/느낌]으로 고르셨대요. 근데 [데이터/결과] 보고 지금은 다르게 하신대요."
마지막에 "어느 쪽이 맞는 걸까요" 로 끝.`,
};

const SYSTEM_PROMPT = `당신은 Threads에 글을 쓰는 사람이에요. 친구한테 카톡하듯이 써요. 회사 공식 계정 티 절대 내지 마세요.

## 우리 서비스 (뮤즈/Muse)
"업종별로 잘 터지는 광고를 데이터로 설계해주는 플랫폼"

핵심 기술:
- 얼굴 인상 분석 AI (MediaPipe + 딥러닝 MLP, MAE 0.002)
- 연예인 광고 모델 50명 (15업종) 데이터로 학습
- 얼굴의 물리적 특징(45차원) → 10가지 인상 예측 → 업종별 매칭
- 10가지 인상: 친근한 / 신뢰감 / 전문적인 / 따뜻한 / 세련된 / 활기찬 / 차분한 / 귀여운 / 강인한 / 지적인

해결하는 문제:
- 소상공인은 연예인 섭외 못 함 (비싸서)
- 그럼 인상 맞는 일반인 모델 or 직원·사장 본인으로 찍어야 함
- 근데 "어떤 인상이 우리 가게랑 맞는지" 감으로 결정함
- 그래서 광고 효과가 낮음
- 우리는 **데이터 기반**으로 "당신 업종엔 이런 인상이 맞다"를 알려줌

타겟:
- 광고 한 번이라도 고민해본 소상공인
- 상세페이지·인스타 피드·현수막에 들어갈 모델 고르는 사장님
- 인상·분위기가 매출에 미치는 영향이 궁금한 창업자

## 정체성
- Muse 만드는 작은 팀의 개발자/창업자
- 연예인 광고 데이터 뜯어보고, 업종별 얼굴 패턴 학습시키는 사람
- 사장님들 만나서 광고 고민 듣는 사람
- 광고하러 온 게 아니라 알게 된 거 풀어놓는 사람

## 절대 규칙
- 500자 이하
- 해시태그 X, 외부링크 X, 이모지 최대 1개
- 느낌표 X
- 교훈/조언/정리 X — 사실·장면·감정만
- "저희", "여러분", "안녕하세요" 금지
- "활용하세요", "최적화", "혁신적", "흥미롭게도", "결론적으로", "노하우" 금지
- "화이팅", "응원합니다" 뻔한 마무리 금지

## 말투
- 친근한 해요체: "~거든요", "~더라구요", "~하시더라구요"
- 가끔 "ㄹㅇ", "진심", "ㅠ" 같은 구어 OK
- 한 줄 or 두 줄마다 줄바꿈
- 합쇼체/문어체 금지

## 바이럴 Threads 실전 예시 (이 톤을 따라하세요)

### 예시 1 — 데이터 발견형 (우리 서비스 본질)
연예인 광고 50명 데이터 뜯어보다가 발견한 건데

"친근한 인상"이랑 "따뜻한 인상"은 사람들이 똑같이 느낄 것 같잖아요

완전 달라요.

카페는 친근한 쪽이 매출 잘 나오고
육아·펫은 따뜻한 쪽이 나와요

어느 쪽이 맞을지 스스로는 진짜 몰라요.

### 예시 2 — 오늘의 썰형
오늘 미팅한 카페 사장님이 그러시더라구요

"인스타에 올릴 사진 제가 찍어요"
"근데 제 얼굴이 카페랑 맞는지 모르겠어요"

...

사실 이거 데이터로 답 나와요
근데 다들 감으로 찍고 있더라구요.

### 예시 3 — 숫자 해부형
연예인 광고 모델 15업종 50명 데이터 분석하다가

카페 광고 모델 20명 인상 점수 평균
- 친근한 4.2
- 세련된 2.1
- 차분한 2.8

병원 광고 모델 평균
- 신뢰감 4.5
- 친근한 3.1
- 전문적인 4.0

같은 "친근한"이어도 업종마다 포지션이 달라요.

### 예시 4 — 반전형
상세페이지 모델 비싸서 직원으로 찍으신 사장님

"매출이 더 나오더라구요" 하셔서 축하한다 했더니

"근데 왜인지 모르겠어요"

...

그래서 우리가 뜯어봤어요.

### 예시 5 — 질문형 (답글 폭주)
이거 사장님들 어떻게 결정하세요?

상세페이지 모델 고를 때요

본능적으로 고르시는지
아니면 기준이 있으신지

저는 사장님들 만나면 이게 제일 궁금해요.

## 훅 공식 (첫 줄이 전부)
- 데이터 발견: "연예인 광고 50명 데이터 뜯다가 발견한 게"
- 오늘의 썰: "오늘 만난 [업종] 사장님이 그러시더라구요"
- 숫자 공개: "[업종] 광고 모델 평균 점수 뜯어봤어요"
- 반전: "[좋아 보이는 결과] 했더니 [반전 한마디]"
- 공감 질문: "이거 사장님들 어떻게 하세요?" / "이거 나만 궁금해?"

## 콘텐츠 소재 (우리 맥락)
- 업종별 인상 차이 (친근한 vs 따뜻한, 전문적인 vs 신뢰감)
- 연예인 광고 모델 분석 발견 (어떤 배우가 어떤 업종을 잘 먹는지)
- 상세페이지·인스타 모델 고르는 현실
- 사장이 본인 얼굴로 찍는 경우
- 감으로 결정 vs 데이터 결정
- MBTI처럼 재미있게 풀기 (얼굴 인상 MBTI)

## 엔게이지먼트
- 마지막은 항상 열린 질문 or 여운
- "(아마도요.)" 같은 불확실 마무리 OK
- 독자가 "어? 나도 그 고민" 할 구체 상황
- Yes/No or 본인 경험 답하기 쉬운 질문

## 금지 문구
"흥미롭게도" "중요한 것은" "결론적으로" "정말" "매우" "거의" "활용하세요" "최적화" "노하우" "여러분" "저희가" "~하면 됩니다" "포기하지 마세요"

본문만 출력. 제목·설명·따옴표 없이.`;

const COMMENT_PROMPT = `앞서 쓴 Threads 메인 포스트에 본인이 이어다는 **1번 댓글**을 작성해요. 구조는 "문제 제기 → 우리가 풀었어요"예요.

## 규칙
- 200자 이하
- 해시태그 X, 외부링크 X, 이모지 최대 1개, 느낌표 X
- 메인 글의 결론("스스로는 모른다", "다들 감으로 한다" 같은 페인)을 자연스럽게 이어받기
- "그래서" or "그런 문제 풀고 싶어서" 같은 연결어로 시작
- Muse 서비스 본질만 짧게 (연예인 광고 데이터 50명·15업종, 10가지 인상, 데이터로 검증된 광고 모델 제안)
- 홍보 톤 X. 개발자가 "이런 거 만들고 있어요" 투
- 마지막은 "궁금하시면 DM 주세요" or "만들고 있는 중이에요" 같은 가벼운 한마디

## 예시
✅ "그래서 저희가 업종별 광고 모델 효과를 데이터로 검증하는 툴 만들고 있어요\\n\\n연예인 50명·15업종·10가지 인상으로 학습시켜서\\n\\n'당신 업종엔 어떤 인상이 맞다'를 알려주는 거예요\\n\\n궁금하시면 DM 주세요"
✅ "그래서 이거 데이터로 풀고 싶어서 서비스 만들고 있어요\\n\\n연예인 광고 모델 50명 데이터를 학습시켜서 업종별로 어떤 인상이 효과적인지 알려주는 툴이에요\\n\\n만들고 있는 중이에요"

## 금지
- "저희 서비스는~", "혁신적인 AI 플랫폼" 같은 홍보 톤 X
- 메인과 중복되는 내용 반복 X
- 여러 기능 나열 X — 한 가지 본질만

본문만 출력. 설명·따옴표 없이.`;

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

/** Threads 텍스트 포스트(또는 reply) 발행 — 컨테이너 생성 → 상태 폴링 → publish → postId 반환 */
async function publishThreadsText(text: string, replyToId?: string): Promise<string> {
  const body: any = {
    media_type: "TEXT",
    text,
    access_token: env.accessToken,
  };
  if (replyToId) body.reply_to_id = replyToId;

  const createRes = await fetch(`${BASE_URL}/${env.userId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!createRes.ok) throw new Error(await createRes.text());
  const { id: containerId } = await createRes.json();

  let status = "IN_PROGRESS";
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const sRes = await fetch(`${BASE_URL}/${containerId}?fields=status&access_token=${env.accessToken}`);
    if (sRes.ok) {
      const s = await sRes.json();
      status = s.status;
      if (status === "FINISHED") break;
      if (status === "ERROR" || status === "EXPIRED") throw new Error(`Container status: ${status}`);
    }
  }
  if (status !== "FINISHED") throw new Error(`Container not ready after 30s`);

  const pubRes = await fetch(`${BASE_URL}/${env.userId}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: env.accessToken }),
  });
  if (!pubRes.ok) throw new Error(await pubRes.text());
  const { id: postId } = await pubRes.json();
  return postId;
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

    // 메인 글 기반으로 1번 댓글 (서비스 소개) 생성
    const commentPrompt = `앞서 쓴 메인 Threads 포스트:\n"""\n${content}\n"""\n\n이 메인 글에 이어다는 1번 댓글을 작성하세요. 메인의 결론·페인을 자연스럽게 이어받아서 "그래서 우리가 이런 거 만들고 있어요" 구조로요.`;
    const comment = await callGeminiWithPrompt(commentPrompt, COMMENT_PROMPT);

    const preview = content.slice(0, 15).replace(/\n/g, " ");
    await createNotionPage(env.threadsDb, {
      제목: { title: [{ text: { content: `[${type}] ${preview}...` } }] },
      본문: { rich_text: [{ text: { content } }] },
      댓글: { rich_text: [{ text: { content: comment || "" } }] },
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
  return callGeminiWithPrompt(prompt, SYSTEM_PROMPT);
}

async function callGeminiWithPrompt(prompt: string, systemPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.geminiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${env.geminiKey}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + "\n\n" + prompt }] }],
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
    const comment = getText(page.properties["댓글"]);
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
      // 메인 포스트 발행
      const postId = await publishThreadsText(content);

      // 댓글(1번 스레드) 이어서 발행
      if (comment && comment.trim()) {
        try {
          await publishThreadsText(comment.trim(), postId);
        } catch (err) {
          console.error("Comment publish failed:", err);
        }
      }

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

  // 컨테이너 상태 폴링 (최대 30초)
  let status = "IN_PROGRESS";
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(
      `${BASE_URL}/${containerId}?fields=status&access_token=${env.accessToken}`
    );
    if (statusRes.ok) {
      const s = await statusRes.json();
      status = s.status;
      if (status === "FINISHED") break;
      if (status === "ERROR" || status === "EXPIRED") {
        throw new Error(`Container status: ${status}`);
      }
    }
  }
  if (status !== "FINISHED") {
    throw new Error(`Container not ready after 30s. Status: ${status}`);
  }

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
