# 백오피스 일정관리 웹사이트 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google Sheets를 DB로 사용하는 서버리스 일정관리 백오피스 (캘린더/칸반/리스트 3가지 뷰 + Todo 리스트)

**Architecture:** Next.js App Router + API Routes가 Google Sheets API v4와 통신. next-auth로 Google OAuth 인증. React Query로 상태 캐싱 및 낙관적 업데이트. shadcn/ui + Tailwind CSS로 UI 구성.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, @fullcalendar/react, @dnd-kit, next-auth, googleapis, @tanstack/react-query, Vercel

---

## 파일 구조

```
backoffice/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 루트 레이아웃 (providers 래핑)
│   │   ├── page.tsx                # 대시보드 (/)
│   │   ├── calendar/
│   │   │   └── page.tsx            # 캘린더 뷰
│   │   ├── board/
│   │   │   └── page.tsx            # 칸반 보드 뷰
│   │   ├── list/
│   │   │   └── page.tsx            # 리스트 뷰
│   │   ├── login/
│   │   │   └── page.tsx            # 로그인 페이지
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       │   └── route.ts        # next-auth 핸들러
│   │       ├── schedules/
│   │       │   ├── route.ts        # GET(목록), POST(생성)
│   │       │   └── [id]/
│   │       │       └── route.ts    # GET(단건), PUT(수정), DELETE(삭제)
│   │       └── todos/
│   │           ├── route.ts        # GET(목록), POST(생성)
│   │           └── [id]/
│   │               └── route.ts    # PUT(수정), DELETE(삭제)
│   ├── lib/
│   │   ├── auth.ts                 # next-auth 설정
│   │   ├── google-sheets.ts        # Google Sheets API 래퍼
│   │   └── utils.ts                # 유틸리티 (cn 함수 등)
│   ├── hooks/
│   │   ├── use-schedules.ts        # 일정 CRUD React Query 훅
│   │   └── use-todos.ts            # Todo CRUD React Query 훅
│   ├── components/
│   │   ├── providers.tsx           # SessionProvider + QueryClientProvider
│   │   ├── navbar.tsx              # 상단 네비게이션
│   │   ├── schedule-modal.tsx      # 일정 생성/수정 모달
│   │   ├── schedule-side-panel.tsx # 일정 상세 사이드 패널 + Todo
│   │   ├── todo-list.tsx           # Todo 리스트 컴포넌트
│   │   ├── todo-item.tsx           # Todo 개별 아이템
│   │   ├── calendar-view.tsx       # FullCalendar 래퍼
│   │   ├── board-view.tsx          # 칸반 보드
│   │   ├── board-column.tsx        # 칸반 컬럼
│   │   ├── board-card.tsx          # 칸반 카드
│   │   ├── list-view.tsx           # 리스트 테이블
│   │   ├── dashboard.tsx           # 대시보드 컴포넌트
│   │   ├── assignee-filter.tsx     # 담당자 필터
│   │   └── ui/                     # shadcn/ui 컴포넌트들
│   └── types/
│       └── index.ts                # Schedule, Todo 타입 정의
├── .env.local                      # 환경변수
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Task 1: 프로젝트 초기화 & 기본 설정

**Files:**
- Create: `package.json`, `next.config.js`, `tailwind.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/lib/utils.ts`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd "c:/Users/somem/Desktop/창업/백오피스"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

선택지가 나오면: TypeScript=Yes, ESLint=Yes, Tailwind=Yes, src/=Yes, App Router=Yes, import alias=@/*

- [ ] **Step 2: shadcn/ui 초기화**

```bash
npx shadcn@latest init -d
```

- [ ] **Step 3: 필요한 shadcn/ui 컴포넌트 설치**

```bash
npx shadcn@latest add button card dialog input label select sheet textarea badge checkbox dropdown-menu avatar separator accordion table toast
```

- [ ] **Step 4: 핵심 패키지 설치**

```bash
npm install next-auth googleapis @tanstack/react-query @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities uuid date-fns
npm install -D @types/uuid
```

- [ ] **Step 5: 타입 정의 작성**

Create `src/types/index.ts`:

```typescript
export interface Schedule {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  scheduleId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
}

export type ScheduleStatus = Schedule['status'];

export interface CreateScheduleInput {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status?: ScheduleStatus;
  assignee?: string;
  color?: string;
}

export interface UpdateScheduleInput extends Partial<CreateScheduleInput> {
  id: string;
}

export interface CreateTodoInput {
  scheduleId: string;
  title: string;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  completed?: boolean;
  order?: number;
}
```

- [ ] **Step 6: 환경변수 템플릿 생성**

Create `.env.local`:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SHEET_ID=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

Create `.env.example` (동일 내용, git 추적용):

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_SHEET_ID=your_google_sheet_id
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 7: 앱 실행 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → Next.js 기본 페이지 표시 확인

- [ ] **Step 8: 커밋**

```bash
git init
git add .
git commit -m "feat: 프로젝트 초기화 - Next.js + Tailwind + shadcn/ui"
```

---

## Task 2: Google OAuth 인증 (next-auth)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/components/providers.tsx`, `src/app/login/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: next-auth 설정 파일 작성**

Create `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/spreadsheets",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
```

- [ ] **Step 2: next-auth 타입 확장**

Create `src/types/next-auth.d.ts`:

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
```

- [ ] **Step 3: API Route 핸들러 작성**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 4: Providers 컴포넌트 작성**

Create `src/components/providers.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 5: 루트 레이아웃에 Providers 적용**

Modify `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "백오피스 - 일정관리",
  description: "팀 일정관리 백오피스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: 로그인 페이지 작성**

Create `src/app/login/page.tsx`:

```typescript
"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">백오피스 일정관리</CardTitle>
          <p className="text-sm text-muted-foreground">
            Google 계정으로 로그인하세요
          </p>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            size="lg"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            Google로 로그인
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: 커밋**

```bash
git add .
git commit -m "feat: Google OAuth 인증 설정 (next-auth)"
```

---

## Task 3: Google Sheets API 래퍼

**Files:**
- Create: `src/lib/google-sheets.ts`

- [ ] **Step 1: Google Sheets 유틸리티 작성**

Create `src/lib/google-sheets.ts`:

```typescript
import { google, sheets_v4 } from "googleapis";
import { Schedule, Todo } from "@/types";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getSheets(accessToken: string): sheets_v4.Sheets {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

// --- Schedules ---

export async function getSchedules(
  accessToken: string
): Promise<Schedule[]> {
  const sheets = getSheets(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Schedules!A2:J",
  });

  const rows = res.data.values || [];
  return rows.map((row) => ({
    id: row[0] || "",
    title: row[1] || "",
    description: row[2] || "",
    startDate: row[3] || "",
    endDate: row[4] || "",
    status: (row[5] || "todo") as Schedule["status"],
    assignee: row[6] || "",
    color: row[7] || "#3b82f6",
    createdAt: row[8] || "",
    updatedAt: row[9] || "",
  }));
}

export async function appendSchedule(
  accessToken: string,
  schedule: Schedule
): Promise<void> {
  const sheets = getSheets(accessToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Schedules!A:J",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          schedule.id,
          schedule.title,
          schedule.description,
          schedule.startDate,
          schedule.endDate,
          schedule.status,
          schedule.assignee,
          schedule.color,
          schedule.createdAt,
          schedule.updatedAt,
        ],
      ],
    },
  });
}

export async function updateSchedule(
  accessToken: string,
  schedule: Schedule
): Promise<void> {
  const sheets = getSheets(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Schedules!A:A",
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === schedule.id);
  if (rowIndex === -1) throw new Error("Schedule not found");

  const rowNumber = rowIndex + 1; // 1-based
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Schedules!A${rowNumber}:J${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          schedule.id,
          schedule.title,
          schedule.description,
          schedule.startDate,
          schedule.endDate,
          schedule.status,
          schedule.assignee,
          schedule.color,
          schedule.createdAt,
          schedule.updatedAt,
        ],
      ],
    },
  });
}

export async function deleteSchedule(
  accessToken: string,
  id: string
): Promise<void> {
  const sheets = getSheets(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Schedules!A:A",
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) throw new Error("Schedule not found");

  // Get spreadsheet to find sheet ID
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
  });
  const schedulesSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === "Schedules"
  );
  const sheetId = schedulesSheet?.properties?.sheetId || 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

// --- Todos ---

export async function getTodos(
  accessToken: string,
  scheduleId?: string
): Promise<Todo[]> {
  const sheets = getSheets(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Todos!A2:F",
  });

  const rows = res.data.values || [];
  const todos = rows.map((row) => ({
    id: row[0] || "",
    scheduleId: row[1] || "",
    title: row[2] || "",
    completed: row[3] === "TRUE",
    order: parseInt(row[4] || "0", 10),
    createdAt: row[5] || "",
  }));

  if (scheduleId) {
    return todos.filter((t) => t.scheduleId === scheduleId);
  }
  return todos;
}

export async function appendTodo(
  accessToken: string,
  todo: Todo
): Promise<void> {
  const sheets = getSheets(accessToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Todos!A:F",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          todo.id,
          todo.scheduleId,
          todo.title,
          todo.completed ? "TRUE" : "FALSE",
          todo.order,
          todo.createdAt,
        ],
      ],
    },
  });
}

export async function updateTodo(
  accessToken: string,
  todo: Todo
): Promise<void> {
  const sheets = getSheets(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Todos!A:A",
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === todo.id);
  if (rowIndex === -1) throw new Error("Todo not found");

  const rowNumber = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Todos!A${rowNumber}:F${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          todo.id,
          todo.scheduleId,
          todo.title,
          todo.completed ? "TRUE" : "FALSE",
          todo.order,
          todo.createdAt,
        ],
      ],
    },
  });
}

export async function deleteTodo(
  accessToken: string,
  id: string
): Promise<void> {
  const sheets = getSheets(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Todos!A:A",
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) throw new Error("Todo not found");

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
  });
  const todosSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === "Todos"
  );
  const sheetId = todosSheet?.properties?.sheetId || 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}
```

- [ ] **Step 2: 커밋**

```bash
git add .
git commit -m "feat: Google Sheets API CRUD 래퍼"
```

---

## Task 4: API Routes (일정 + Todo)

**Files:**
- Create: `src/app/api/schedules/route.ts`, `src/app/api/schedules/[id]/route.ts`, `src/app/api/todos/route.ts`, `src/app/api/todos/[id]/route.ts`

- [ ] **Step 1: 인증 헬퍼 작성**

Add to `src/lib/auth.ts` (append):

```typescript
import { getServerSession } from "next-auth";

export async function getAuthSession() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return null;
  }
  return session;
}
```

- [ ] **Step 2: 일정 목록/생성 API**

Create `src/app/api/schedules/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getSchedules, appendSchedule } from "@/lib/google-sheets";
import { Schedule } from "@/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedules = await getSchedules(session.accessToken);
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const now = new Date().toISOString();

  const schedule: Schedule = {
    id: uuidv4(),
    title: body.title,
    description: body.description || "",
    startDate: body.startDate,
    endDate: body.endDate,
    status: body.status || "todo",
    assignee: body.assignee || session.user?.email || "",
    color: body.color || "#3b82f6",
    createdAt: now,
    updatedAt: now,
  };

  await appendSchedule(session.accessToken, schedule);
  return NextResponse.json(schedule, { status: 201 });
}
```

- [ ] **Step 3: 일정 단건 조회/수정/삭제 API**

Create `src/app/api/schedules/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  getSchedules,
  updateSchedule,
  deleteSchedule,
} from "@/lib/google-sheets";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedules = await getSchedules(session.accessToken);
  const schedule = schedules.find((s) => s.id === params.id);
  if (!schedule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(schedule);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const schedules = await getSchedules(session.accessToken);
  const existing = schedules.find((s) => s.id === params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = {
    ...existing,
    ...body,
    id: params.id,
    updatedAt: new Date().toISOString(),
  };

  await updateSchedule(session.accessToken, updated);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteSchedule(session.accessToken, params.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Todo 목록/생성 API**

Create `src/app/api/todos/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getTodos, appendTodo } from "@/lib/google-sheets";
import { Todo } from "@/types";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scheduleId = req.nextUrl.searchParams.get("scheduleId") || undefined;
  const todos = await getTodos(session.accessToken, scheduleId);
  return NextResponse.json(todos);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const now = new Date().toISOString();

  const todo: Todo = {
    id: uuidv4(),
    scheduleId: body.scheduleId,
    title: body.title,
    completed: false,
    order: body.order || 0,
    createdAt: now,
  };

  await appendTodo(session.accessToken, todo);
  return NextResponse.json(todo, { status: 201 });
}
```

- [ ] **Step 5: Todo 수정/삭제 API**

Create `src/app/api/todos/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getTodos, updateTodo, deleteTodo } from "@/lib/google-sheets";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const todos = await getTodos(session.accessToken);
  const existing = todos.find((t) => t.id === params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = { ...existing, ...body, id: params.id };
  await updateTodo(session.accessToken, updated);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteTodo(session.accessToken, params.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 6: 커밋**

```bash
git add .
git commit -m "feat: 일정 및 Todo CRUD API Routes"
```

---

## Task 5: React Query 커스텀 훅

**Files:**
- Create: `src/hooks/use-schedules.ts`, `src/hooks/use-todos.ts`

- [ ] **Step 1: 일정 훅 작성**

Create `src/hooks/use-schedules.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Schedule,
  CreateScheduleInput,
  UpdateScheduleInput,
} from "@/types";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useSchedules() {
  return useQuery<Schedule[]>({
    queryKey: ["schedules"],
    queryFn: () => fetchJSON("/api/schedules"),
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateScheduleInput) =>
      fetchJSON<Schedule>("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateScheduleInput) =>
      fetchJSON<Schedule>(`/api/schedules/${input.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON(`/api/schedules/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}
```

- [ ] **Step 2: Todo 훅 작성**

Create `src/hooks/use-todos.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Todo, CreateTodoInput, UpdateTodoInput } from "@/types";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useTodos(scheduleId?: string) {
  return useQuery<Todo[]>({
    queryKey: ["todos", scheduleId],
    queryFn: () => {
      const params = scheduleId ? `?scheduleId=${scheduleId}` : "";
      return fetchJSON(`/api/todos${params}`);
    },
    enabled: !!scheduleId,
  });
}

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTodoInput) =>
      fetchJSON<Todo>("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["todos", variables.scheduleId] });
    },
  });
}

export function useUpdateTodo(scheduleId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTodoInput) =>
      fetchJSON<Todo>(`/api/todos/${input.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos", scheduleId] });
    },
  });
}

export function useDeleteTodo(scheduleId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON(`/api/todos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos", scheduleId] });
    },
  });
}
```

- [ ] **Step 3: 커밋**

```bash
git add .
git commit -m "feat: React Query 커스텀 훅 (일정 + Todo)"
```

---

## Task 6: 네비게이션 & 레이아웃

**Files:**
- Create: `src/components/navbar.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 네비게이션 바 작성**

Create `src/components/navbar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "대시보드" },
  { href: "/calendar", label: "캘린더" },
  { href: "/board", label: "칸반보드" },
  { href: "/list", label: "리스트" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <header className="border-b bg-white">
      <div className="flex h-14 items-center px-6">
        <Link href="/" className="mr-8 text-lg font-bold">
          백오피스
        </Link>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100",
                pathname === item.href
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user?.image || ""} />
                  <AvatarFallback>
                    {session.user?.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-sm text-muted-foreground">
                {session.user?.email}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 레이아웃에 Navbar 추가**

Modify `src/app/layout.tsx` — `<Providers>` 안에 `<Navbar />` 추가:

```typescript
<Providers>
  <Navbar />
  <main className="flex-1">{children}</main>
  <Toaster />
</Providers>
```

(import 추가: `import { Navbar } from "@/components/navbar";`)

- [ ] **Step 3: 커밋**

```bash
git add .
git commit -m "feat: 네비게이션 바 & 레이아웃"
```

---

## Task 7: 일정 생성/수정 모달 & 사이드 패널

**Files:**
- Create: `src/components/schedule-modal.tsx`, `src/components/schedule-side-panel.tsx`, `src/components/todo-list.tsx`, `src/components/todo-item.tsx`, `src/components/assignee-filter.tsx`

- [ ] **Step 1: 일정 생성/수정 모달**

Create `src/components/schedule-modal.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateSchedule, useUpdateSchedule } from "@/hooks/use-schedules";
import { Schedule, ScheduleStatus } from "@/types";

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  schedule?: Schedule | null;
  defaultDate?: string;
}

export function ScheduleModal({
  open,
  onClose,
  schedule,
  defaultDate,
}: ScheduleModalProps) {
  const isEdit = !!schedule;
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();

  const [title, setTitle] = useState(schedule?.title || "");
  const [description, setDescription] = useState(schedule?.description || "");
  const [startDate, setStartDate] = useState(
    schedule?.startDate?.slice(0, 16) || defaultDate || ""
  );
  const [endDate, setEndDate] = useState(
    schedule?.endDate?.slice(0, 16) || defaultDate || ""
  );
  const [status, setStatus] = useState<ScheduleStatus>(
    schedule?.status || "todo"
  );
  const [assignee, setAssignee] = useState(schedule?.assignee || "");
  const [color, setColor] = useState(schedule?.color || COLORS[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { title, description, startDate, endDate, status, assignee, color };

    if (isEdit) {
      await updateSchedule.mutateAsync({ id: schedule.id, ...data });
    } else {
      await createSchedule.mutateAsync(data);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "일정 수정" : "새 일정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">시작</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">종료</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>상태</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ScheduleStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">할 일</SelectItem>
                  <SelectItem value="in-progress">진행중</SelectItem>
                  <SelectItem value="done">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assignee">담당자</Label>
              <Input
                id="assignee"
                type="email"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="이메일"
              />
            </div>
          </div>
          <div>
            <Label>색상</Label>
            <div className="mt-1 flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-6 w-6 rounded-full border-2 ${
                    color === c ? "border-gray-900" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">{isEdit ? "수정" : "생성"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Todo 아이템 컴포넌트**

Create `src/components/todo-item.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Todo } from "@/types";
import { useUpdateTodo, useDeleteTodo } from "@/hooks/use-todos";

interface TodoItemProps {
  todo: Todo;
  scheduleId: string;
}

export function TodoItem({ todo, scheduleId }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const updateTodo = useUpdateTodo(scheduleId);
  const deleteTodo = useDeleteTodo(scheduleId);

  const handleToggle = () => {
    updateTodo.mutate({ id: todo.id, completed: !todo.completed });
  };

  const handleSave = () => {
    if (title.trim()) {
      updateTodo.mutate({ id: todo.id, title: title.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div className="group flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
      <Checkbox checked={todo.completed} onCheckedChange={handleToggle} />
      {isEditing ? (
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="h-7 text-sm"
          autoFocus
        />
      ) : (
        <span
          className={`flex-1 cursor-pointer text-sm ${
            todo.completed ? "text-gray-400 line-through" : ""
          }`}
          onDoubleClick={() => setIsEditing(true)}
        >
          {todo.title}
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
        onClick={() => deleteTodo.mutate(todo.id)}
      >
        ×
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Todo 리스트 컴포넌트**

Create `src/components/todo-list.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { TodoItem } from "@/components/todo-item";
import { useTodos, useCreateTodo } from "@/hooks/use-todos";

interface TodoListProps {
  scheduleId: string;
}

export function TodoList({ scheduleId }: TodoListProps) {
  const { data: todos = [] } = useTodos(scheduleId);
  const createTodo = useCreateTodo();
  const [newTitle, setNewTitle] = useState("");

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createTodo.mutate({ scheduleId, title: newTitle.trim() });
    setNewTitle("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">할 일 목록</h4>
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} 완료
          </span>
        )}
      </div>
      {totalCount > 0 && (
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full bg-green-500 transition-all"
            style={{
              width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
            }}
          />
        </div>
      )}
      <div className="space-y-0.5">
        {todos
          .sort((a, b) => a.order - b.order)
          .map((todo) => (
            <TodoItem key={todo.id} todo={todo} scheduleId={scheduleId} />
          ))}
      </div>
      <Input
        placeholder="할 일 추가 (Enter)"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        className="h-8 text-sm"
      />
    </div>
  );
}
```

- [ ] **Step 4: 사이드 패널**

Create `src/components/schedule-side-panel.tsx`:

```typescript
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TodoList } from "@/components/todo-list";
import { Schedule } from "@/types";
import { useDeleteSchedule } from "@/hooks/use-schedules";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";
import { ScheduleModal } from "@/components/schedule-modal";

const statusLabels: Record<string, string> = {
  todo: "할 일",
  "in-progress": "진행중",
  done: "완료",
};

interface ScheduleSidePanelProps {
  schedule: Schedule | null;
  open: boolean;
  onClose: () => void;
}

export function ScheduleSidePanel({
  schedule,
  open,
  onClose,
}: ScheduleSidePanelProps) {
  const deleteSchedule = useDeleteSchedule();
  const [editOpen, setEditOpen] = useState(false);

  if (!schedule) return null;

  const handleDelete = async () => {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    await deleteSchedule.mutateAsync(schedule.id);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-[400px] overflow-y-auto sm:w-[540px]">
          <SheetHeader>
            <div className="flex items-start gap-2">
              <div
                className="mt-1 h-3 w-3 rounded-full"
                style={{ backgroundColor: schedule.color }}
              />
              <SheetTitle className="flex-1 text-left">
                {schedule.title}
              </SheetTitle>
            </div>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Badge variant="outline">{statusLabels[schedule.status]}</Badge>
              {schedule.assignee && (
                <Badge variant="secondary">{schedule.assignee}</Badge>
              )}
            </div>
            {schedule.description && (
              <p className="text-sm text-muted-foreground">
                {schedule.description}
              </p>
            )}
            <div className="text-sm text-muted-foreground">
              <p>
                시작:{" "}
                {format(new Date(schedule.startDate), "PPP p", { locale: ko })}
              </p>
              <p>
                종료:{" "}
                {format(new Date(schedule.endDate), "PPP p", { locale: ko })}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                수정
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                삭제
              </Button>
            </div>

            <Separator />

            <TodoList scheduleId={schedule.id} />
          </div>
        </SheetContent>
      </Sheet>

      <ScheduleModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        schedule={schedule}
      />
    </>
  );
}
```

- [ ] **Step 5: 담당자 필터**

Create `src/components/assignee-filter.tsx`:

```typescript
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchedules } from "@/hooks/use-schedules";

interface AssigneeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function AssigneeFilter({ value, onChange }: AssigneeFilterProps) {
  const { data: schedules = [] } = useSchedules();
  const assignees = [...new Set(schedules.map((s) => s.assignee).filter(Boolean))];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="전체 담당자" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체 담당자</SelectItem>
        {assignees.map((a) => (
          <SelectItem key={a} value={a}>
            {a}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 6: 커밋**

```bash
git add .
git commit -m "feat: 일정 모달, 사이드 패널, Todo 리스트, 담당자 필터"
```

---

## Task 8: 캘린더 뷰

**Files:**
- Create: `src/components/calendar-view.tsx`, `src/app/calendar/page.tsx`

- [ ] **Step 1: 캘린더 뷰 컴포넌트**

Create `src/components/calendar-view.tsx`:

```typescript
"use client";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useSchedules } from "@/hooks/use-schedules";
import { ScheduleModal } from "@/components/schedule-modal";
import { ScheduleSidePanel } from "@/components/schedule-side-panel";
import { Schedule } from "@/types";

export function CalendarView() {
  const { data: schedules = [] } = useSchedules();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );
  const [panelOpen, setPanelOpen] = useState(false);

  const events = schedules.map((s) => ({
    id: s.id,
    title: s.title,
    start: s.startDate,
    end: s.endDate,
    backgroundColor: s.color,
    borderColor: s.color,
    extendedProps: { schedule: s },
  }));

  return (
    <div className="h-[calc(100vh-3.5rem)] p-6">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek",
        }}
        locale="ko"
        events={events}
        dateClick={(info) => {
          setSelectedDate(info.dateStr + "T09:00");
          setModalOpen(true);
        }}
        eventClick={(info) => {
          setSelectedSchedule(info.event.extendedProps.schedule);
          setPanelOpen(true);
        }}
        height="100%"
      />

      <ScheduleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDate={selectedDate}
      />

      <ScheduleSidePanel
        schedule={selectedSchedule}
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          setSelectedSchedule(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: 캘린더 페이지**

Create `src/app/calendar/page.tsx`:

```typescript
import { CalendarView } from "@/components/calendar-view";

export default function CalendarPage() {
  return <CalendarView />;
}
```

- [ ] **Step 3: 커밋**

```bash
git add .
git commit -m "feat: 캘린더 뷰 (FullCalendar 월간/주간)"
```

---

## Task 9: 칸반 보드 뷰

**Files:**
- Create: `src/components/board-view.tsx`, `src/components/board-column.tsx`, `src/components/board-card.tsx`, `src/app/board/page.tsx`

- [ ] **Step 1: 칸반 카드**

Create `src/components/board-card.tsx`:

```typescript
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Schedule } from "@/types";
import { useTodos } from "@/hooks/use-todos";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface BoardCardProps {
  schedule: Schedule;
  onClick: () => void;
}

export function BoardCard({ schedule, onClick }: BoardCardProps) {
  const { data: todos = [] } = useTodos(schedule.id);
  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: schedule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-pointer p-3 hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div
          className="mt-1 h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: schedule.color }}
        />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{schedule.title}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(schedule.startDate), "M/d", { locale: ko })}
          </p>
          {schedule.assignee && (
            <Badge variant="secondary" className="text-xs">
              {schedule.assignee.split("@")[0]}
            </Badge>
          )}
          {totalCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-1 flex-1 rounded-full bg-gray-100">
                <div
                  className="h-1 rounded-full bg-green-500"
                  style={{
                    width: `${(completedCount / totalCount) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{totalCount}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: 칸반 컬럼**

Create `src/components/board-column.tsx`:

```typescript
"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { BoardCard } from "@/components/board-card";
import { Schedule, ScheduleStatus } from "@/types";

const columnLabels: Record<ScheduleStatus, string> = {
  todo: "할 일",
  "in-progress": "진행중",
  done: "완료",
};

const columnColors: Record<ScheduleStatus, string> = {
  todo: "bg-gray-100",
  "in-progress": "bg-blue-50",
  done: "bg-green-50",
};

interface BoardColumnProps {
  status: ScheduleStatus;
  schedules: Schedule[];
  onCardClick: (schedule: Schedule) => void;
}

export function BoardColumn({
  status,
  schedules,
  onCardClick,
}: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div className={`flex-1 rounded-lg ${columnColors[status]} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{columnLabels[status]}</h3>
        <span className="text-xs text-muted-foreground">
          {schedules.length}
        </span>
      </div>
      <div ref={setNodeRef} className="space-y-2">
        <SortableContext
          items={schedules.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {schedules.map((schedule) => (
            <BoardCard
              key={schedule.id}
              schedule={schedule}
              onClick={() => onCardClick(schedule)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 칸반 보드 뷰**

Create `src/components/board-view.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { BoardColumn } from "@/components/board-column";
import { ScheduleSidePanel } from "@/components/schedule-side-panel";
import { ScheduleModal } from "@/components/schedule-modal";
import { AssigneeFilter } from "@/components/assignee-filter";
import { Button } from "@/components/ui/button";
import { useSchedules, useUpdateSchedule } from "@/hooks/use-schedules";
import { Schedule, ScheduleStatus } from "@/types";

const STATUSES: ScheduleStatus[] = ["todo", "in-progress", "done"];

export function BoardView() {
  const { data: schedules = [] } = useSchedules();
  const updateSchedule = useUpdateSchedule();
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState("all");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filtered =
    filterAssignee === "all"
      ? schedules
      : schedules.filter((s) => s.assignee === filterAssignee);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const scheduleId = active.id as string;
    const newStatus = over.id as ScheduleStatus;

    if (STATUSES.includes(newStatus)) {
      const schedule = schedules.find((s) => s.id === scheduleId);
      if (schedule && schedule.status !== newStatus) {
        updateSchedule.mutate({ id: scheduleId, status: newStatus });
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">칸반보드</h1>
        <div className="flex gap-2">
          <AssigneeFilter value={filterAssignee} onChange={setFilterAssignee} />
          <Button onClick={() => setModalOpen(true)}>+ 새 일정</Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-4">
          {STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              schedules={filtered.filter((s) => s.status === status)}
              onCardClick={(s) => {
                setSelectedSchedule(s);
                setPanelOpen(true);
              }}
            />
          ))}
        </div>
      </DndContext>

      <ScheduleSidePanel
        schedule={selectedSchedule}
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          setSelectedSchedule(null);
        }}
      />

      <ScheduleModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 4: 칸반 페이지**

Create `src/app/board/page.tsx`:

```typescript
import { BoardView } from "@/components/board-view";

export default function BoardPage() {
  return <BoardView />;
}
```

- [ ] **Step 5: 커밋**

```bash
git add .
git commit -m "feat: 칸반 보드 뷰 (드래그앤드롭 상태 변경)"
```

---

## Task 10: 리스트 뷰

**Files:**
- Create: `src/components/list-view.tsx`, `src/app/list/page.tsx`

- [ ] **Step 1: 리스트 뷰 컴포넌트**

Create `src/components/list-view.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AssigneeFilter } from "@/components/assignee-filter";
import { ScheduleModal } from "@/components/schedule-modal";
import { ScheduleSidePanel } from "@/components/schedule-side-panel";
import { TodoList } from "@/components/todo-list";
import { useSchedules } from "@/hooks/use-schedules";
import { Schedule } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  todo: "할 일",
  "in-progress": "진행중",
  done: "완료",
};

const statusColors: Record<string, string> = {
  todo: "bg-gray-100 text-gray-800",
  "in-progress": "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
};

export function ListView() {
  const { data: schedules = [] } = useSchedules();
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const filtered =
    filterAssignee === "all"
      ? schedules
      : schedules.filter((s) => s.assignee === filterAssignee);

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">리스트</h1>
        <div className="flex gap-2">
          <AssigneeFilter value={filterAssignee} onChange={setFilterAssignee} />
          <Button onClick={() => setModalOpen(true)}>+ 새 일정</Button>
        </div>
      </div>

      <Accordion type="multiple" className="flex-1 overflow-y-auto">
        {sorted.map((schedule) => (
          <AccordionItem key={schedule.id} value={schedule.id}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-1 items-center gap-3 pr-4">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: schedule.color }}
                />
                <span className="flex-1 text-left text-sm font-medium">
                  {schedule.title}
                </span>
                <Badge className={statusColors[schedule.status]} variant="outline">
                  {statusLabels[schedule.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(schedule.startDate), "M/d", { locale: ko })}
                  {" ~ "}
                  {format(new Date(schedule.endDate), "M/d", { locale: ko })}
                </span>
                {schedule.assignee && (
                  <Badge variant="secondary" className="text-xs">
                    {schedule.assignee.split("@")[0]}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSchedule(schedule);
                    setPanelOpen(true);
                  }}
                >
                  상세
                </Button>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 pb-4">
              {schedule.description && (
                <p className="mb-3 text-sm text-muted-foreground">
                  {schedule.description}
                </p>
              )}
              <TodoList scheduleId={schedule.id} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <ScheduleModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <ScheduleSidePanel
        schedule={selectedSchedule}
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          setSelectedSchedule(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: 리스트 페이지**

Create `src/app/list/page.tsx`:

```typescript
import { ListView } from "@/components/list-view";

export default function ListPage() {
  return <ListView />;
}
```

- [ ] **Step 3: 커밋**

```bash
git add .
git commit -m "feat: 리스트 뷰 (아코디언 + Todo)"
```

---

## Task 11: 대시보드

**Files:**
- Create: `src/components/dashboard.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 대시보드 컴포넌트**

Create `src/components/dashboard.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScheduleModal } from "@/components/schedule-modal";
import { ScheduleSidePanel } from "@/components/schedule-side-panel";
import { useSchedules } from "@/hooks/use-schedules";
import { Schedule } from "@/types";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { ko } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  todo: "할 일",
  "in-progress": "진행중",
  done: "완료",
};

export function Dashboard() {
  const { data: schedules = [] } = useSchedules();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const todaySchedules = schedules.filter((s) =>
    isToday(new Date(s.startDate))
  );
  const tomorrowSchedules = schedules.filter((s) =>
    isTomorrow(new Date(s.startDate))
  );
  const weekSchedules = schedules.filter(
    (s) =>
      isThisWeek(new Date(s.startDate)) &&
      !isToday(new Date(s.startDate)) &&
      !isTomorrow(new Date(s.startDate))
  );

  const todoCount = schedules.filter((s) => s.status === "todo").length;
  const inProgressCount = schedules.filter(
    (s) => s.status === "in-progress"
  ).length;
  const doneCount = schedules.filter((s) => s.status === "done").length;

  const ScheduleItem = ({ schedule }: { schedule: Schedule }) => (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50"
      onClick={() => {
        setSelectedSchedule(schedule);
        setPanelOpen(true);
      }}
    >
      <div
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: schedule.color }}
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{schedule.title}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(schedule.startDate), "a h:mm", { locale: ko })}
        </p>
      </div>
      <Badge variant="outline">{statusLabels[schedule.status]}</Badge>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "PPP (EEEE)", { locale: ko })}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ 새 일정</Button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              할 일
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todoCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              진행중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {inProgressCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{doneCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>오늘 일정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaySchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                오늘 일정이 없습니다
              </p>
            ) : (
              todaySchedules.map((s) => <ScheduleItem key={s.id} schedule={s} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>내일 일정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tomorrowSchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                내일 일정이 없습니다
              </p>
            ) : (
              tomorrowSchedules.map((s) => (
                <ScheduleItem key={s.id} schedule={s} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {weekSchedules.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>이번 주 나머지 일정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weekSchedules.map((s) => (
              <ScheduleItem key={s.id} schedule={s} />
            ))}
          </CardContent>
        </Card>
      )}

      <ScheduleModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <ScheduleSidePanel
        schedule={selectedSchedule}
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          setSelectedSchedule(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: 메인 페이지 연결**

Modify `src/app/page.tsx`:

```typescript
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  return <Dashboard />;
}
```

- [ ] **Step 3: 커밋**

```bash
git add .
git commit -m "feat: 대시보드 (오늘/내일/이번주 일정 + 상태 통계)"
```

---

## Task 12: 미들웨어 (인증 보호) & 최종 점검

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: 인증 미들웨어**

Create `src/middleware.ts`:

```typescript
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: .gitignore 확인**

`.env.local`이 .gitignore에 포함되어 있는지 확인. Next.js 기본 .gitignore에 포함되어 있으므로 별도 작업 불필요.

- [ ] **Step 3: 앱 실행 확인**

```bash
npm run dev
```

- `/login` → Google 로그인 페이지 표시 확인
- 미인증 상태에서 `/` 접속 시 `/login`으로 리다이렉트 확인

- [ ] **Step 4: 빌드 확인**

```bash
npm run build
```

에러 없이 빌드 성공 확인.

- [ ] **Step 5: 최종 커밋**

```bash
git add .
git commit -m "feat: 인증 미들웨어 & 최종 설정"
```

---

## 구현 순서 요약

| Task | 내용 | 의존성 |
|------|------|--------|
| 1 | 프로젝트 초기화 | 없음 |
| 2 | Google OAuth 인증 | Task 1 |
| 3 | Google Sheets API 래퍼 | Task 1 |
| 4 | API Routes | Task 2, 3 |
| 5 | React Query 훅 | Task 4 |
| 6 | 네비게이션 & 레이아웃 | Task 2 |
| 7 | 모달, 사이드패널, Todo | Task 5 |
| 8 | 캘린더 뷰 | Task 7 |
| 9 | 칸반 보드 뷰 | Task 7 |
| 10 | 리스트 뷰 | Task 7 |
| 11 | 대시보드 | Task 5 |
| 12 | 미들웨어 & 최종 점검 | Task 2 |
