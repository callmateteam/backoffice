import { google, sheets_v4 } from "googleapis";
import { Schedule, Todo } from "@/types";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getSheets(accessToken: string): sheets_v4.Sheets {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

// --- Schedules ---

export async function getSchedules(accessToken: string): Promise<Schedule[]> {
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

  const rowNumber = rowIndex + 1;
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
