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

// --- Categories & Weekly Schedule ---

const CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  A: '제품데모',
  B: '사장님케이스',
  C: '데이터연예인',
  D: '빌인퍼블릭',
  E: '업계관점',
  F: '일상',
  G: '학습',
  H: '양방향',
  I: 'AI약빨',
};

// Notion select 옵션 색상 (default, gray, brown, orange, yellow, green, blue, purple, pink, red 중)
const CATEGORY_COLORS: Record<Category, string> = {
  A: 'purple',
  B: 'pink',
  C: 'blue',
  D: 'orange',
  E: 'red',
  F: 'gray',
  G: 'green',
  H: 'yellow',
  I: 'brown',
};

// 매일 카테고리가 다르도록 2주 사이클로 9개 모두 커버
type DayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
const WEEKLY_SCHEDULE: Record<'weekA' | 'weekB', Record<DayName, Category>> = {
  weekA: { Mon: 'C', Tue: 'D', Wed: 'A', Thu: 'B', Fri: 'I', Sat: 'E', Sun: 'F' },
  weekB: { Mon: 'A', Tue: 'C', Wed: 'D', Thu: 'B', Fri: 'I', Sat: 'G', Sun: 'H' },
};

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getTodayCategory(now: Date = new Date()): Category {
  // KST 기준
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const day: DayName = (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const)[kst.getUTCDay()];
  const week = getISOWeek(kst) % 2 === 1 ? 'weekA' : 'weekB';
  return WEEKLY_SCHEDULE[week][day];
}

// --- 라벨 → 자연어 사전 (점수 노출 금지, 자연어로 변환) ---

const IMPRESSION_NATURAL: Record<string, string[]> = {
  친근한: ['동네 단골 사장님 같은', '옆집 형 같은', '편한 친구 같은', '동네 카페 알바 같은', '동창회 가는 친구 같은'],
  신뢰감: ['병원 원장님 같은', '은행원 같은', '오래 다닌 학원 선생님 같은', '믿을 수 있는 변호사 같은', '동네 약국 약사님 같은'],
  전문적인: ['TV 나오는 박사님 같은', '강의하는 교수님 같은', 'IT 컨퍼런스 발표자 같은', '잘나가는 컨설턴트 같은', '대기업 임원 같은'],
  따뜻한: ['엄마 같은', '할머니 카페 사장님 같은', '어린이집 선생님 같은', '동네 분식집 이모님 같은', '시골 게스트하우스 주인장 같은'],
  세련된: ['압구정 카페 사장님 같은', '패션 잡지 모델 같은', '강남 미용실 디자이너 같은', '브랜드 매장 매니저 같은', '플라워샵 사장님 같은'],
  활기찬: ['체대생 같은', '주말 등산회 회장님 같은', '동네 헬스장 트레이너 같은', '학교 응원단장 같은', '캠핑 유튜버 같은'],
  차분한: ['도서관 사서 같은', '한옥 카페 사장님 같은', '명상 학원 강사 같은', '독립서점 주인장 같은', '한방차 가게 사장님 같은'],
  귀여운: ['디저트 가게 알바 같은', '캐릭터 굿즈샵 사장님 같은', '인형 가게 사장님 같은', '베이커리 새내기 알바 같은', '꽃집 막내 같은'],
  강인한: ['운동선수 같은', '건설현장 반장님 같은', '군 지휘관 같은', '격투기 코치 같은', '소방관 같은'],
  지적인: ['교수님 같은', '회계사 같은', '신문 칼럼니스트 같은', '서점 사장님 같은', '연구원 같은'],
};

// --- 카테고리별 토픽 풀 ---

const CATEGORY_TOPICS: Record<Category, string[]> = {
  A: [
    '카페 사장님 광고', '베이커리 사장님 광고', '헬스장 사장님 광고',
    '미용실 사장님 광고', '식당 사장님 광고', '펫샵 사장님 광고',
    '학원 원장님 광고', '병원 원장님 광고', '꽃집 사장님 광고',
    '인테리어 업체 사장님 광고',
  ],
  B: [
    '카페 사장님 미팅', '베이커리 사장님 미팅', '미용실 사장님 미팅',
    '헬스장 사장님 미팅', '병원 원장님 미팅', '식당 사장님 미팅',
    '펫샵 사장님 미팅', '학원 원장님 미팅', '인테리어 업체 사장님 미팅',
    '꽃집 사장님 미팅',
  ],
  C: [
    '카페 광고 모델 패턴', '병원 광고 모델 패턴', '헬스장 광고 모델 패턴',
    '펫샵 광고 모델 패턴', '뷰티 광고 모델 패턴', '학원 광고 모델 패턴',
    '식당 광고 모델 패턴', '동네 가게 vs 강남 가게 톤 차이',
    '같은 업종 다른 톤 비교', '연예인 광고 매칭 패턴',
    '업종별 인상 분포',
  ],
  D: [
    '모델 정확도 개선', '데이터 라벨링 다시', '백엔드 다시 짬',
    'API 연결 디버깅', '새벽 코딩 인증', 'MVP 카운트다운',
    '버그 잡은 썰', '인프라 비용 계산', '모델 학습 돌리는 중',
    'GPT API 비용 폭탄', 'Vercel 배포 삽질',
  ],
  E: [
    '1억 모델 vs 직원 사진 매출 차이', 'AI 광고가 망하는 이유',
    '비싼 모델 함정', '광고 대행사가 안 알려주는 거',
    '감으로 결정하는 광고 문화', '인스타 광고 vs 매출 괴리',
    '연예인 모델 ROI 진실', '상세페이지 모델 진실',
    'AI 이미지 티 나는 이유', '광고 효율 측정 안 하는 문화',
  ],
  F: [
    '본인 얼굴 분석', '사무실 풍경', '새벽 코딩 인증',
    '사장님 미팅 후기', '라면/커피 인증', '본인 인상 vs 실제',
    '옷차림 고민', '오늘 들은 노래', '주말에도 일하는 썰',
  ],
  G: [
    '친근한 vs 따뜻한', '신뢰감 vs 전문적인', '세련된 vs 차분한',
    '활기찬 vs 강인한', '인상 MBTI', '업종별 어울리는 인상',
    '인상이 매출에 미치는 영향', '광고 톤 잡는 법',
  ],
  H: [
    '무료 분석 5명', '무료 분석 10명', '사장님 인상 봐드리기',
    '이 사장님 어떤 인상으로 보여요? (사진)', '본인 인상 알려주세요',
    '업종 추천 받아드림', '광고 사진 같이 만들어드림',
  ],
  I: [
    '짧은 프롬프트로 망함', '모순 인풋 (강인+귀여운 등)',
    '극단값 한 인상만 강하게', '너무 디테일한 인풋',
    '의외로 잘 나온 약빨', '주간 망작 베스트',
  ],
};

// --- 베이스 페르소나 (모든 카테고리 공유) ---

const BASE_PERSONA = `당신은 Threads에 글을 쓰는 사람이에요. 친구한테 카톡하듯이 써요. 회사 공식 계정 티 절대 내지 마세요.

## 정체성 (절대 무너지지 마세요)
- Muse 만드는 작은 팀의 개발자/창업자
- 예전에 광고 이미지 편집을 직접 해본 사람
- AI 이미지 모델(GPT 등) 직접 다뤄본 실무자
- 프롬프트 디테일 한 줄에 매출 갈리는 거 직접 경험함
- 사장님들 만나서 광고 고민 듣는 사람
- 광고하러 온 게 아니라 알게 된 거 풀어놓는 톤

## 우리 서비스 (Muse)
"업종별로 잘 터지는 광고를 데이터로 설계해주는 플랫폼"
사장님 사진 한 장 → 인상 분석 + 광고 이미지 자동 생성
"딸깍 한 번이면 가게 광고 완성"

핵심 기술:
- 얼굴 인상 분석 AI (MediaPipe + 딥러닝)
- 연예인 광고 모델 50명·15업종 데이터로 학습
- 10가지 인상 → 업종별 매칭 → 광고 이미지 자동 생성

타겟:
- 광고 한 번이라도 고민해본 소상공인
- 상세페이지·인스타 피드·현수막에 들어갈 사진 고르는 사장님

## 라벨 → 자연어 변환 (필수 — 점수 노출 절대 금지)
"친근한 5점", "신뢰감 4.2점" 같은 점수 본문 노출 절대 X
라벨도 그대로 쓰지 말고 자연어로:

${Object.entries(IMPRESSION_NATURAL).map(([label, exprs]) => `${label} → ${exprs.slice(0, 3).join(' / ')}`).join('\n')}

(예외: D 빌인퍼블릭 카테고리만 점수/수치 OK — 개발 디테일이 매력)

## 절대 규칙
- 500자 이하
- 점수/라벨 그대로 노출 X (D 카테고리 제외)
- 해시태그 X, 외부링크 X, 이모지 최대 1개
- 느낌표 X
- 교훈/조언/정리 X — 사실·장면·감정만
- "여러분", "저희", "안녕하세요" 금지
- "활용하세요", "최적화", "혁신적", "흥미롭게도", "결론적으로", "노하우" 금지
- "화이팅", "응원합니다" 뻔한 마무리 금지

## 말투
- 친근한 해요체: "~거든요", "~더라구요", "~하시더라구요"
- 가끔 "ㄹㅇ", "진심", "ㅠ", "ㅋㅋ" 구어 OK
- 한 줄 or 두 줄마다 줄바꿈
- 합쇼체/문어체 금지

본문만 출력. 제목·설명·따옴표 없이.`;

// --- 카테고리별 시스템 프롬프트 ---

const CATEGORY_PROMPTS: Record<Category, string> = {
  A: `${BASE_PERSONA}

## [A 제품데모]
오늘 분석한 사장님 사례 + 자동 생성 광고 이미지 보여주는 글.
형식: 권위 → 인사이트 → 그래서 만든 거 → 오늘 데모.

## 도입 패턴 (이 중 하나)
- "광고 이미지 편집해본 사람은 알 거예요"
- "GPT 이미지 모델로 광고 만들어본 사람은~"
- "광고 사진 손으로 편집해본 사람만 아는 게 있어요"

## 구조
1. 권위 한 줄 (편집 경험)
2. 인사이트 (프롬프트 디테일이 매출 가른다 / AI 티 나는 이유)
3. 그래서 만들고 있는 거
4. 오늘 분석한 사장님 + 자동 생성 광고 ([이미지] 마커)
5. 짧은 코멘트

## 예시
광고 이미지 편집해본 사람은 알 거예요

GPT 이미지 모델 진짜 좋아졌는데
프롬프트에 따라 성능이 너무 달라요

똑같이 빵집 사장님 광고 만들라고 해도
어떻게 적냐에 따라
매출 잘 나올 광고 vs 딱 봐도 AI인 거 갈려요

결국 "이 사장님이 어떤 톤이냐"를 정확히 잡아야 함

그래서 데이터로 자동 매칭하는 거 만들고 있어요

오늘 베이커리 사장님 광고 5초 걸림
[이미지]`,

  B: `${BASE_PERSONA}

## [B 사장님 케이스]
오늘 만난 사장님 썰. 사람 스토리 + 분석 결과.

## 도입 패턴
- "오늘 미팅한 [업종] 사장님이 그러시더라구요"
- "오늘 [업종] 사장님이 본인 얼굴 보여주시면서~"

## 구조
1. 사장님 인용 (걱정/고민)
2. 분석 결과 (자연어로)
3. 예전에 편집할 때 같은 케이스 봤다는 코멘트
4. 여운 한 줄

## 예시
오늘 미팅한 카페 사장님이 그러시더라구요

"제 얼굴이 너무 강해 보여요
카페랑 안 어울리는 거 같아서
직원 사진으로 찍었어요"

근데 분석해보니까
운동선수 톤이 살짝 있긴 한데
오히려 "동네 형 같은 인상"이 더 강하셨어요

예전에 편집하면서 이런 케이스 진짜 많이 봤어요
본인 얼굴이 가게에 더 잘 맞는데 직원 사진 쓰는 분

본인 얼굴은 본인이 제일 모르는 거 같아요.`,

  C: `${BASE_PERSONA}

## [C 데이터/연예인]
연예인 광고 모델 50명·15업종 데이터에서 발견한 패턴.
형식: 편집 경험에서 느낀 의문 → 데이터로 검증 → 결론.

## 도입 패턴
- "예전에 [업종] 광고 이미지 편집하면서 느낀 건데"
- "예전에 광고 편집할 때 항상 의문이었던 게"

## 구조
1. 편집 경험에서 느낀 의문/패턴
2. (옵션) GPT 프롬프트 디테일 인사이트 — "친근한"이라고만 쓰면 AI 티 남, "동네 단골 사장님 같은" 같은 자연어가 진짜
3. 데이터로 검증 (50명·15업종)
4. 발견한 패턴 자연어로
5. 짧은 임팩트 마무리

## 예시
예전에 카페 광고 이미지 편집하면서 느낀 건데

GPT 이미지 모델에 "친근한 사장님"이라고만 쓰면
그냥 미소 띈 AI 사람 나와요

"동네 단골 사장님" 이라고 써야
진짜 카페 어울리는 톤 나옴

디테일 한 줄 차이가 매출 차이에요

그래서 연예인 광고 모델 50명 데이터 뜯어봤어요
카페 매출 잘 나오는 광고 = "동네 단골" 톤
압구정 사장님 톤은 의외로 매출 못 따라감

톤 하나로 매출이 갈려요.`,

  D: `${BASE_PERSONA}

## [D 빌인퍼블릭]
개발 진척, 솔로 창업기. 1인칭 일기 톤.
유일하게 점수/수치 OK인 카테고리 (개발 디테일이 매력).

## 도입 패턴
- "MVP D-XX"
- "오늘 [작업] 함"
- "새벽 [시간], [작업] 중"

## 구조
1. 진척 한 줄 (정확도, 버전, 작업)
2. 어떤 디테일에 빠졌는지
3. 솔로 디테일 (라면, 새벽, 의자, 카페인)
4. 살짝 자조 마무리

## 톤 특이사항
- 점수/수치 OK ("정확도 0.94", "라벨 50개")
- 짧고 끊어진 문장
- 자조적이지만 귀엽게

## 예시
MVP D-30

오늘 모델 정확도 0.92 → 0.94
1주일 걸림

라벨링 데이터 다시 보다가
"친근한"이랑 "따뜻한"이 섞여 있더라구요

연예인 50명 다시 분류
새벽 4시
라면 두 번 먹음

다 사장님들 좋은 광고 만들어드리려고 하는 거예요 ㅋㅋ`,

  E: `${BASE_PERSONA}

## [E 업계 관점/폭로]
광고 업계 사람만 아는 거 풀어내기. 가장 강한 권위 필요.

## 도입 패턴
- "광고 이미지 편집해본 사람은 알지만 사장님들한텐 잘 안 말하는 거"
- "광고 업계에서 다들 알지만 공개적으로 말 안 하는 거"

## 구조
1. 권위 깐 도입
2. 충격적 사실 (비싼 모델 = 매출 X / AI 티 나는 이유)
3. 진짜 차이는 톤
4. 결론 한 줄

## 예시
광고 이미지 편집해본 사람은 알지만
사장님들한텐 잘 안 말하는 거

AI로 만든 광고가 매출 안 나오는 이유
비용 아니에요

프롬프트 이상하게 쓰면
AI 이미지 느낌이 그대로 남아요

사람들 그거 귀신같이 알아채요
"어 이거 AI네" 하고 스크롤 넘김

진짜 차이는 "사장님이 어떤 톤이냐" 디테일을 잡았냐

1억 모델이든 직원 사진이든
톤 안 맞으면 매출 안 나와요.`,

  F: `${BASE_PERSONA}

## [F 일상]
가벼운 일기. 본인 모습 보여주기. 인간미.

## 도입 패턴
- "오늘 ~"
- "오늘 [본인 분석/사무실/먹은 거]"

## 구조
1. 본인 일상 한 장면
2. 살짝 사장님/제품 컨텍스트
3. 자조 마무리

## 톤 특이사항
- 짧음 (200-300자)
- 농담조
- 광고 X
- "ㅋㅋ", "ㅠ" 자주

## 예시
오늘 제 얼굴 분석해봤어요

사장님들 만나러 다녀야 하는데
나온 결과가

"군 지휘관 같은 인상"

ㅠ

미팅 갈 때 좀 살살 웃어야겠어요.`,

  G: `${BASE_PERSONA}

## [G 학습 콘텐츠]
"OO 인상이란?" 같은 짧은 학습 자료. 두 인상 비교가 핵심.

## 도입 패턴
- "[A 인상] vs [B 인상] 차이"
- "[인상] 진짜 뜻은~"

## 구조
1. 두 인상 비교 또는 정의 (자연어로)
2. 사진 비유 (어떤 사람 톤인지)
3. 업종별로 다르게 먹히는 점

## 예시
"친근한 인상" vs "따뜻한 인상"

비슷해 보이는데 광고에선 완전 달라요

친근한 = 동네 단골 사장님 톤
- 카페, 식당, 동네 가게에 잘 먹힘

따뜻한 = 어린이집 선생님 톤
- 육아, 펫, 요양 광고에 잘 먹힘

같은 가게라도 어느 톤 잡냐에 따라 매출 달라져요.`,

  H: `${BASE_PERSONA}

## [H 양방향/챌린지]
참여 유도. DM/댓글 받기. 즉시 행동 가능한 제안.

## 도입 패턴
- "오늘 [N명] 무료로 ~ 해드릴게요"
- "이거 사장님들 어떻게 하세요?"
- "여러분 이 인상 어떤 거 같아요?"

## 구조
1. 무료/제안 한 줄
2. 어떻게 받는지
3. 가벼운 면죄 ("결과 만족할진 모름 ㅋㅋ")

## 예시
오늘 사장님 5분만 무료로 분석해드릴게요

DM 주세요

본인 얼굴이 어떤 톤인지
어떤 업종 광고에 어울릴지 말씀드릴게요

대신 결과를 만족하실지는
저도 모릅니다 ㅋㅋ`,

  I: `${BASE_PERSONA}

## [I AI 약빨/실패작]
일부러 망친 AI 이미지 시리즈. 자조적 유머. 금요일 시리즈.

## 도입 패턴
- "오늘 [업종] 광고 만들다가"
- "[극단 인풋] + [극단 인풋] 같이 넣었더니"

## 구조
1. 무엇을 시도했는지
2. 망한 결과 ([대괄호로 이미지 묘사])
3. 짧은 자조 한 줄

## 톤 특이사항 (다른 카테고리와 완전 다름)
- 자조적, 가볍게
- "ㅋㅋ", "ㅠ" 많이
- 광고 메시지 X (홍보 X)
- 200-300자 짧게
- "그래도 우리 서비스는~" 절대 X
- 진지한 분석/해명 X
- (옵션) 프롬프트 디테일 부족이 망친 이유 살짝

## 예시 1 — 짧은 프롬프트
오늘 베이커리 광고 만들다가

"친근한 사장님" 짧게 적었더니

[너무 활짝 웃는 사람이 빵 들고 있음. 누가 봐도 AI]

디테일 안 적으면 이렇게 됨 ㅋㅋ

빵집 사장님 죄송합니다
다음엔 "동네 단골 사장님 톤"으로 적을게요.

## 예시 2 — 모순 인풋
운동선수 같은 인상
+
디저트 가게 알바 같은 인상

같이 만들어달라 했더니

[근육질 햄스터가 마카롱 들고 카운터에 서있음]

모델이 화났어요
사과 받습니다.`,
};

function buildSystemPrompt(category: Category): string {
  return CATEGORY_PROMPTS[category];
}

const COMMENT_PROMPT = `앞서 쓴 Threads 메인 포스트에 본인이 이어다는 **1번 댓글**을 작성해요. 구조는 "현장 통찰 → 그래서 만들고 있어요"예요.

## 페르소나
- 예전에 광고 이미지 편집해본 사람
- AI 이미지 모델(GPT 등) 다뤄본 실무자
- 사장님들 만나는 사람
- 광고하러 온 게 아니라 알게 된 거 풀어놓는 톤

## 규칙
- 200자 이하
- 해시태그 X, 외부링크 X, 이모지 최대 1개, 느낌표 X
- 메인 글의 결론(페인)을 자연스럽게 이어받기
- "그래서" or "그런 문제 풀고 싶어서" 같은 연결어로 시작
- Muse 본질만 짧게: "사장님 사진 한 장 → 인상 분석 + 광고 이미지 자동 생성", "딸깍 한 번이면 가게 광고 완성"
- 점수("친근한 4.2") / 라벨 그대로 노출 X — 자연어로
- 홍보 톤 X. 개발자가 "이런 거 만들고 있어요" 투
- 마지막은 "궁금하시면 DM 주세요" or "만들고 있는 중이에요" 같은 가벼운 한마디

## 예시
✅ "그래서 사장님 사진 한 장 넣으면 광고가 완성되는 거 만들고 있어요\\n\\n인상 자동 분석 + 그 톤에 맞는 광고 이미지 생성을 5초 만에 해주는 거예요\\n\\n궁금하시면 DM 주세요"
✅ "그래서 이거 데이터로 풀고 싶어서 만들고 있어요\\n\\n사장님 사진 한 장이면 광고 한 장 5초 만에 나오는 거예요\\n\\n만들고 있는 중이에요"

## 금지
- "저희 서비스는~", "혁신적인 AI 플랫폼" 같은 홍보 톤 X
- 점수, 라벨 그대로 노출 X
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

// --- Notion 카테고리 옵션 자동 등록 ---

let categoryOptionsEnsured = false;

async function ensureCategoryOptionsInNotion(): Promise<void> {
  if (categoryOptionsEnsured) return;
  if (!env.threadsDb || !env.notionToken) return;

  try {
    const res = await fetch(`${NOTION_API}/databases/${env.threadsDb}`, {
      headers: notionHeaders(),
    });
    if (!res.ok) return;
    const db = await res.json();
    const currentOptions: Array<{ name: string; color?: string }> =
      db.properties?.['유형']?.select?.options ?? [];
    const currentNames = new Set(currentOptions.map((o) => o.name));

    const desired = CATEGORIES.map((cat) => ({
      name: CATEGORY_LABELS[cat],
      color: CATEGORY_COLORS[cat],
    }));
    const toAdd = desired.filter((o) => !currentNames.has(o.name));
    if (toAdd.length === 0) {
      categoryOptionsEnsured = true;
      return;
    }

    const merged = [...currentOptions, ...toAdd];
    const patchRes = await fetch(`${NOTION_API}/databases/${env.threadsDb}`, {
      method: 'PATCH',
      headers: notionHeaders(),
      body: JSON.stringify({
        properties: { '유형': { select: { options: merged } } },
      }),
    });
    if (patchRes.ok) {
      categoryOptionsEnsured = true;
      console.log(`Notion 유형 컬럼에 옵션 ${toAdd.length}개 추가됨:`, toAdd.map((o) => o.name).join(', '));
    } else {
      console.error('Notion options update failed:', await patchRes.text());
    }
  } catch (err) {
    console.error('ensureCategoryOptionsInNotion error:', err);
  }
}

// --- Generate ---

// 메인 글 + 1번 댓글(서비스 소개)을 다는 카테고리 — 인사이트형만
const SERVICE_INTRO_CATEGORIES: Category[] = ['A', 'B', 'C', 'E'];

export async function generateDrafts(): Promise<{ count: number; category: string }> {
  // Notion 유형 select 옵션 자동 보장 (콜드 스타트당 1회)
  await ensureCategoryOptionsInNotion();

  // 오늘 카테고리 결정 (요일 + ISO 주차 → WEEKLY_SCHEDULE)
  const category = getTodayCategory();
  const categoryLabel = CATEGORY_LABELS[category];

  // 오늘 KST 0시 이후 생성된 초안이 이미 있으면 중단 (하루 1개 정책)
  const todayKst = new Date(Date.now() + 9 * 3600 * 1000);
  todayKst.setUTCHours(0, 0, 0, 0);
  const todayUtc = new Date(todayKst.getTime() - 9 * 3600 * 1000);

  const todayDrafts = await queryNotionDb(env.threadsDb, {
    timestamp: 'created_time',
    created_time: { on_or_after: todayUtc.toISOString() },
  });
  if (todayDrafts.length > 0) {
    console.log(`Skip: 오늘 이미 ${todayDrafts.length}개 초안 존재`);
    return { count: 0, category: categoryLabel };
  }

  // 최근 글 (중복 회피)
  const recent = await queryNotionDb(env.threadsDb, undefined,
    [{ timestamp: 'created_time', direction: 'descending' }], 6);
  const recentContents = recent.slice(0, 3).map((p: any) => getText(p.properties['본문']));

  // 카테고리 토픽 풀에서 1개
  const topics = CATEGORY_TOPICS[category];
  const topic = topics[Math.floor(Math.random() * topics.length)];

  const systemPrompt = buildSystemPrompt(category);

  const userPrompt = `오늘 카테고리: ${category} (${categoryLabel})
주제: ${topic}

위 카테고리·주제로 500자 이하 Threads 글 작성.${
    recentContents.length > 0
      ? `\n\n최근 작성한 글 (중복 피하세요):\n${recentContents.join('\n---\n')}`
      : ''
  }`;

  const content = await callGeminiWithPrompt(userPrompt, systemPrompt);
  if (!content || content.length > 500) return { count: 0, category: categoryLabel };

  // 1번 댓글 (서비스 소개) — 인사이트형 카테고리만
  let comment = '';
  if (SERVICE_INTRO_CATEGORIES.includes(category)) {
    const commentPrompt = `앞서 쓴 메인 Threads 포스트:\n"""\n${content}\n"""\n\n이 메인 글에 이어다는 1번 댓글을 작성하세요. 메인의 결론·페인을 자연스럽게 이어받아서 "그래서 우리가 이런 거 만들고 있어요" 구조로요.`;
    comment = await callGeminiWithPrompt(commentPrompt, COMMENT_PROMPT);
  }

  const preview = content.slice(0, 15).replace(/\n/g, ' ');
  await createNotionPage(env.threadsDb, {
    제목: { title: [{ text: { content: `[${categoryLabel}] ${preview}...` } }] },
    본문: { rich_text: [{ text: { content } }] },
    댓글: { rich_text: [{ text: { content: comment || '' } }] },
    유형: { select: { name: categoryLabel } },
    상태: { select: { name: '초안' } },
  });

  if (env.discordWebhook) {
    await fetch(env.discordWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: 'Threads 초안 생성됨',
          color: 0x7c3aed,
          fields: [
            { name: '카테고리', value: `${category} (${categoryLabel})`, inline: true },
            { name: '주제', value: topic, inline: true },
            { name: '글자수', value: `${content.length}자`, inline: true },
            { name: '본문', value: content.length > 300 ? content.slice(0, 300) + '...' : content },
            ...(comment ? [{ name: '1번 댓글', value: comment.length > 200 ? comment.slice(0, 200) + '...' : comment }] : []),
          ],
          footer: { text: '백오피스에서 확인 후 승인해주세요' },
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(() => {});
  }

  return { count: 1, category: categoryLabel };
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
    return await callGeminiWithPrompt(context, REPLY_SYSTEM_PROMPT);
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
