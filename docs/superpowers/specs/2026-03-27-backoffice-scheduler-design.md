# 백오피스 일정관리 웹사이트 설계 문서

## 개요
소규모 팀(2~5명)이 사용하는 일정관리 백오피스. Google Sheets를 DB로 사용하여 별도 서버 없이 운영. 일정 등록/관리 + 각 일정에 하위 Todo 리스트 기능 제공.

## 기술 스택
- **프레임워크:** Next.js 14+ (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **캘린더:** @fullcalendar/react
- **드래그앤드롭:** @dnd-kit
- **인증:** Google OAuth (next-auth)
- **데이터:** Google Sheets API v4
- **상태관리:** React Query (TanStack Query)
- **배포:** Vercel

## 아키텍처
```
[브라우저] → [Next.js 프론트] → [Next.js API Routes] → [Google Sheets API]
                                      ↑
                              (API 키 보호, 서버사이드)
```

- 프론트엔드에서 내부 API Route 호출
- API Route가 Google Sheets API로 CRUD 수행
- React Query가 캐싱 및 낙관적 업데이트 담당

## 데이터 구조 (Google Sheets)

### `Schedules` 시트
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | string | 고유 ID (UUID) |
| title | string | 일정 제목 |
| description | string | 설명 |
| startDate | string | 시작일시 (ISO 8601) |
| endDate | string | 종료일시 (ISO 8601) |
| status | string | `todo` / `in-progress` / `done` |
| assignee | string | 담당자 이메일 |
| color | string | 라벨 색상 (hex) |
| createdAt | string | 생성일시 (ISO 8601) |
| updatedAt | string | 수정일시 (ISO 8601) |

### `Todos` 시트
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | string | 고유 ID (UUID) |
| scheduleId | string | 연결된 일정 ID (FK) |
| title | string | 할일 내용 |
| completed | boolean | TRUE / FALSE |
| order | number | 정렬 순서 |
| createdAt | string | 생성일시 (ISO 8601) |

관계: 일정 1개 : Todo N개 (1:N). `scheduleId`로 조인.

## 페이지 구성
| 경로 | 설명 |
|---|---|
| `/` | 대시보드 (오늘 일정 요약) |
| `/calendar` | 캘린더 뷰 (월간/주간) |
| `/board` | 칸반 보드 뷰 |
| `/list` | 리스트 뷰 |

3개 뷰 모두 동일 데이터, 표현 방식만 다름.

## 주요 기능

### 일정 관리
- **생성:** 캘린더 날짜 클릭 또는 "+ 새 일정" 버튼 → 모달로 입력
- **수정:** 일정 카드 클릭 → 사이드 패널에서 편집
- **삭제:** 사이드 패널 내 삭제 버튼 (확인 다이얼로그)
- **상태 변경:** 칸반 보드에서 드래그앤드롭으로 상태 전환

### Todo 리스트 (일정 하위)
- 일정 사이드 패널 하단에 todo 목록 표시
- 체크박스로 완료/미완료 토글
- 인라인 추가 (Enter키로 빠르게 추가)
- 드래그로 순서 변경
- 진행률 표시 (예: 3/5 완료)

### 뷰별 동작
| 뷰 | 특징 |
|---|---|
| 캘린더 | FullCalendar 월간/주간 전환. 날짜 클릭 → 일정 생성. 일정 클릭 → 사이드 패널 |
| 칸반 | 3컬럼(todo/in-progress/done). 카드 드래그로 상태 변경. 카드에 todo 진행률 표시 |
| 리스트 | 테이블형 목록. 펼침(accordion)으로 todo 표시. 정렬/필터 지원 |

### 공통 기능
- 상단 네비게이션에서 뷰 전환 (탭)
- 담당자 필터 (팀원별 보기)
- 색상 라벨로 일정 구분

## 인증 & 보안

### Google OAuth 흐름
1. 로그인 버튼 클릭 → Google OAuth 동의 화면
2. `google-sheets` 스코프 권한 요청
3. next-auth가 access token 관리 (자동 갱신)
4. 팀원들은 같은 Google Sheet에 접근 권한 부여

### 접근 제어
- Google Sheet 자체의 공유 설정으로 팀원 관리
- 로그인한 사용자만 API Route 접근 가능 (next-auth 세션 체크)

### 환경변수
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SHEET_ID=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## 에러 처리
- Google Sheets API 호출 실패 시 토스트 알림
- 네트워크 오프라인 시 읽기 전용 모드 (캐시된 데이터 표시)
- OAuth 토큰 만료 시 자동 갱신, 실패 시 재로그인 유도
