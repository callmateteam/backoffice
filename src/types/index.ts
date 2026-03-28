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
  assignee: string;
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
  assignee?: string;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  completed?: boolean;
  order?: number;
  assignee?: string;
}
