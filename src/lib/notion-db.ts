import { Schedule, Todo } from "@/types";
import { Notice } from "@/types/notice";
import { Meeting } from "@/types/meeting";
import { WorkLog } from "@/types/worklog";

const NOTION_API = "https://api.notion.com/v1";

function getToken() { return process.env.NOTION_TOKEN!; }
function getDbId(name: string) {
  const map: Record<string, string> = {
    schedules: process.env.NOTION_SCHEDULES_DB!,
    todos: process.env.NOTION_TODOS_DB!,
    notices: process.env.NOTION_NOTICES_DB!,
    meetings: process.env.NOTION_MEETINGS_DB!,
    worklogs: process.env.NOTION_WORKLOGS_DB!,
  };
  return map[name];
}

function getHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };
}

// --- Helpers ---

async function queryDb(dbId: string, filter?: any, sorts?: any[]): Promise<any[]> {
  const body: any = {};
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;

  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Notion query failed: ${await res.text()}`);
  const data = await res.json();
  return data.results || [];
}

async function createPage(dbId: string, properties: any): Promise<string> {
  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      parent: { database_id: dbId as string },
      properties,
    }),
  });

  if (!res.ok) throw new Error(`Notion create failed: ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

async function updatePage(pageId: string, properties: any): Promise<void> {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) throw new Error(`Notion update failed: ${await res.text()}`);
}

async function archivePage(pageId: string): Promise<void> {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ archived: true }),
  });

  if (!res.ok) throw new Error(`Notion archive failed: ${await res.text()}`);
}

function getText(prop: any): string {
  return prop?.rich_text?.[0]?.plain_text ?? prop?.title?.[0]?.plain_text ?? "";
}

function getDate(prop: any): string {
  return prop?.date?.start ?? "";
}

function getCheckbox(prop: any): boolean {
  return prop?.checkbox ?? false;
}

function getNumber(prop: any): number {
  return prop?.number ?? 0;
}

function getSelect(prop: any): string {
  return prop?.select?.name ?? "";
}

function getUrl(prop: any): string {
  return prop?.url ?? "";
}

function getCreatedTime(page: any): string {
  return page.created_time ?? "";
}

function richText(value: string) {
  return { rich_text: [{ text: { content: value } }] };
}

function titleProp(value: string) {
  return { title: [{ text: { content: value } }] };
}

function dateProp(value: string) {
  if (!value) return { date: null };
  return { date: { start: value } };
}

function selectProp(value: string) {
  return { select: { name: value } };
}

function checkboxProp(value: boolean) {
  return { checkbox: value };
}

function numberProp(value: number) {
  return { number: value };
}

function urlProp(value: string) {
  if (!value) return { url: null };
  return { url: value };
}

// --- Schedules ---

function parseSchedule(page: any): Schedule {
  const p = page.properties;
  return {
    id: page.id,
    title: getText(p["제목"]),
    description: getText(p["description"]),
    startDate: getDate(p["startDate"]),
    endDate: getDate(p["endDate"]),
    status: (getSelect(p["status"]) || "todo") as Schedule["status"],
    assignee: getText(p["assignee"]),
    color: getText(p["color"]) || "#3b82f6",
    createdAt: getCreatedTime(page),
    updatedAt: page.last_edited_time ?? "",
  };
}

export async function getSchedules(): Promise<Schedule[]> {
  const pages = await queryDb(getDbId("schedules"));
  return pages.map(parseSchedule);
}

export async function appendSchedule(schedule: Schedule): Promise<void> {
  await createPage(getDbId("schedules"), {
    제목: titleProp(schedule.title),
    description: richText(schedule.description),
    startDate: dateProp(schedule.startDate),
    endDate: dateProp(schedule.endDate),
    status: selectProp(schedule.status),
    assignee: richText(schedule.assignee),
    color: richText(schedule.color),
  });
}

export async function updateSchedule(schedule: Schedule): Promise<void> {
  await updatePage(schedule.id, {
    제목: titleProp(schedule.title),
    description: richText(schedule.description),
    startDate: dateProp(schedule.startDate),
    endDate: dateProp(schedule.endDate),
    status: selectProp(schedule.status),
    assignee: richText(schedule.assignee),
    color: richText(schedule.color),
  });
}

export async function deleteSchedule(id: string): Promise<void> {
  await archivePage(id);
}

// --- Todos ---

function parseTodo(page: any): Todo {
  const p = page.properties;
  return {
    id: page.id,
    scheduleId: getText(p["scheduleId"]),
    title: getText(p["제목"]),
    completed: getCheckbox(p["completed"]),
    order: getNumber(p["order"]),
    assignee: getText(p["assignee"]),
    link: getUrl(p["link"]),
    createdAt: getCreatedTime(page),
  };
}

export async function getTodos(scheduleId?: string): Promise<Todo[]> {
  let filter;
  if (scheduleId) {
    filter = {
      property: "scheduleId",
      rich_text: { equals: scheduleId },
    };
  }

  const pages = await queryDb(getDbId("todos"), filter);
  return pages.map(parseTodo);
}

export async function appendTodo(todo: Todo): Promise<void> {
  await createPage(getDbId("todos"), {
    제목: titleProp(todo.title),
    scheduleId: richText(todo.scheduleId),
    completed: checkboxProp(todo.completed),
    order: numberProp(todo.order),
    assignee: richText(todo.assignee),
    link: urlProp(todo.link),
  });
}

export async function updateTodo(todo: Todo): Promise<void> {
  await updatePage(todo.id, {
    제목: titleProp(todo.title),
    scheduleId: richText(todo.scheduleId),
    completed: checkboxProp(todo.completed),
    order: numberProp(todo.order),
    assignee: richText(todo.assignee),
    link: urlProp(todo.link),
  });
}

export async function deleteTodo(id: string): Promise<void> {
  await archivePage(id);
}

// --- Notices ---

function parseNotice(page: any): Notice {
  const p = page.properties;
  return {
    id: page.id,
    title: getText(p["제목"]),
    content: getText(p["content"]),
    author: getText(p["author"]),
    createdAt: getCreatedTime(page),
  };
}

export async function getNotices(): Promise<Notice[]> {
  const pages = await queryDb(getDbId("notices"), undefined, [
    { timestamp: "created_time", direction: "descending" },
  ]);
  return pages.map(parseNotice);
}

export async function appendNotice(notice: Notice): Promise<void> {
  await createPage(getDbId("notices"), {
    제목: titleProp(notice.title),
    content: richText(notice.content),
    author: richText(notice.author),
  });
}

export async function deleteNotice(id: string): Promise<void> {
  await archivePage(id);
}

// --- Meetings ---

function parseMeeting(page: any): Meeting {
  const p = page.properties;
  return {
    id: page.id,
    title: getText(p["제목"]),
    date: getDate(p["date"]),
    startTime: getText(p["startTime"]),
    endTime: getText(p["endTime"]),
    participants: getText(p["participants"]),
    agenda: getText(p["agenda"]),
    minutes: getText(p["minutes"]),
    createdAt: getCreatedTime(page),
  };
}

export async function getMeetings(): Promise<Meeting[]> {
  const pages = await queryDb(getDbId("meetings"), undefined, [
    { timestamp: "created_time", direction: "descending" },
  ]);
  return pages.map(parseMeeting);
}

export async function appendMeeting(meeting: Meeting): Promise<void> {
  await createPage(getDbId("meetings"), {
    제목: titleProp(meeting.title),
    date: dateProp(meeting.date),
    startTime: richText(meeting.startTime),
    endTime: richText(meeting.endTime),
    participants: richText(meeting.participants),
    agenda: richText(meeting.agenda),
    minutes: richText(meeting.minutes),
  });
}

export async function updateMeeting(meeting: Meeting): Promise<void> {
  await updatePage(meeting.id, {
    제목: titleProp(meeting.title),
    date: dateProp(meeting.date),
    startTime: richText(meeting.startTime),
    endTime: richText(meeting.endTime),
    participants: richText(meeting.participants),
    agenda: richText(meeting.agenda),
    minutes: richText(meeting.minutes),
  });
}

export async function deleteMeeting(id: string): Promise<void> {
  await archivePage(id);
}

// --- WorkLogs ---

function parseWorkLog(page: any): WorkLog {
  const p = page.properties;
  return {
    id: page.id,
    date: getDate(p["date"]),
    author: getText(p["author"]),
    content: getText(p["content"]),
    createdAt: getCreatedTime(page),
  };
}

export async function getWorkLogs(): Promise<WorkLog[]> {
  const pages = await queryDb(getDbId("worklogs"), undefined, [
    { timestamp: "created_time", direction: "descending" },
  ]);
  return pages.map(parseWorkLog);
}

export async function appendWorkLog(log: WorkLog): Promise<void> {
  await createPage(getDbId("worklogs"), {
    제목: titleProp(`${log.date} - ${log.author}`),
    date: dateProp(log.date),
    author: richText(log.author),
    content: richText(log.content),
  });
}

export async function updateWorkLog(log: WorkLog): Promise<void> {
  await updatePage(log.id, {
    제목: titleProp(`${log.date} - ${log.author}`),
    date: dateProp(log.date),
    author: richText(log.author),
    content: richText(log.content),
  });
}
