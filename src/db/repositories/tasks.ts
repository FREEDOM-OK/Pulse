import type { SqlParam } from '../driver';
import { getDriver } from '../connection';
import type { TaskRow } from '../types';
import { deleteSetting, getSetting, setSetting } from './settings';
import { nowIso, todayStr } from '@/lib/date';
import { createRepeatGroupId } from '@/lib/id';

export interface CreateTaskInput {
  date: string;
  title: string;
  note?: string | null;
  time?: string | null;
  pinned?: boolean;
  /** 勾选「今日未完成自动延期到下一天」；ID 记在 settings 表，不新增字段。 */
  autoPostpone?: boolean;
}

export interface TaskPatch {
  title?: string;
  note?: string | null;
  time?: string | null;
  done?: boolean;
  pinned?: boolean;
}

export interface TaskStats {
  total: number;
  completed: number;
}

async function nextSortOrder(date: string): Promise<number> {
  const row = await getDriver().getFirstAsync<{ maxOrder: number | null }>(
    'SELECT MAX(sort_order) AS maxOrder FROM tasks WHERE date = ?',
    [date]
  );
  return Number(row?.maxOrder ?? 0) + 1;
}

export async function listTasksByDate(date: string): Promise<TaskRow[]> {
  return getDriver().getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE date = ? ORDER BY sort_order ASC, id ASC',
    [date]
  );
}

export async function listTasksInRange(from: string, to: string): Promise<TaskRow[]> {
  return getDriver().getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE date BETWEEN ? AND ? ORDER BY date ASC, sort_order ASC, id ASC',
    [from, to]
  );
}

export async function getTaskStats(date: string): Promise<TaskStats> {
  const row = await getDriver().getFirstAsync<{ total: number; completed: number | null }>(
    'SELECT COUNT(*) AS total, SUM(done) AS completed FROM tasks WHERE date = ?',
    [date]
  );
  return { total: Number(row?.total ?? 0), completed: Number(row?.completed ?? 0) };
}

export async function createTask(input: CreateTaskInput): Promise<number> {
  const driver = getDriver();
  const sortOrder = await nextSortOrder(input.date);
  const result = await driver.runAsync(
    `INSERT INTO tasks (date, title, note, time, done, completed_at, repeat_group_id, sort_order, pinned, created_at)
     VALUES (?, ?, ?, ?, 0, NULL, NULL, ?, ?, ?)`,
    [
      input.date,
      input.title,
      input.note ?? null,
      input.time ?? null,
      sortOrder,
      input.pinned ? 1 : 0,
      nowIso(),
    ]
  );
  const id = result.lastInsertRowId;
  if (input.autoPostpone) await addAutoPostponeIds([id]);
  return id;
}

/** 一次添加到连续 days 天（含起始日），共用 repeat_group_id。 */
export async function createTaskSeries(
  input: CreateTaskInput,
  days: number
): Promise<number[]> {
  const driver = getDriver();
  const groupId = createRepeatGroupId();
  const ids: number[] = [];
  const createdAt = nowIso();

  await driver.withTransactionAsync(async () => {
    for (let offset = 0; offset < days; offset += 1) {
      const date = addDaysLocal(input.date, offset);
      const sortOrder = await nextSortOrder(date);
      const result = await driver.runAsync(
        `INSERT INTO tasks (date, title, note, time, done, completed_at, repeat_group_id, sort_order, pinned, created_at)
         VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)`,
        [
          date,
          input.title,
          input.note ?? null,
          input.time ?? null,
          groupId,
          sortOrder,
          input.pinned ? 1 : 0,
          createdAt,
        ]
      );
      ids.push(result.lastInsertRowId);
    }
  });

  if (input.autoPostpone) await addAutoPostponeIds(ids);
  return ids;
}

/** 避免与 lib/date 循环依赖，这里用最小实现。 */
function addDaysLocal(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function updateTask(id: number, patch: TaskPatch): Promise<void> {
  const fields: string[] = [];
  const params: SqlParam[] = [];

  if (patch.title !== undefined) {
    fields.push('title = ?');
    params.push(patch.title);
  }
  if (patch.note !== undefined) {
    fields.push('note = ?');
    params.push(patch.note);
  }
  if (patch.time !== undefined) {
    fields.push('time = ?');
    params.push(patch.time);
  }
  if (patch.done !== undefined) {
    fields.push('done = ?', 'completed_at = ?');
    params.push(patch.done ? 1 : 0, patch.done ? nowIso() : null);
  }
  if (patch.pinned !== undefined) {
    fields.push('pinned = ?');
    params.push(patch.pinned ? 1 : 0);
  }
  if (fields.length === 0) return;

  params.push(id);
  await getDriver().runAsync(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function setTaskPinned(id: number, pinned: boolean): Promise<void> {
  await getDriver().runAsync('UPDATE tasks SET pinned = ? WHERE id = ?', [pinned ? 1 : 0, id]);
}

export async function toggleTask(id: number): Promise<boolean> {
  const driver = getDriver();
  const row = await driver.getFirstAsync<{ done: number }>('SELECT done FROM tasks WHERE id = ?', [
    id,
  ]);
  if (!row) throw new Error('任务不存在');
  const next = row.done === 1 ? 0 : 1;
  await driver.runAsync('UPDATE tasks SET done = ?, completed_at = ? WHERE id = ?', [
    next,
    next === 1 ? nowIso() : null,
    id,
  ]);
  return next === 1;
}

/** 把任务移动到另一天（顺延），排到目标日期末尾。 */
export async function moveTaskToDate(id: number, date: string): Promise<void> {
  const driver = getDriver();
  const sortOrder = await nextSortOrder(date);
  await driver.runAsync('UPDATE tasks SET date = ?, sort_order = ? WHERE id = ?', [
    date,
    sortOrder,
    id,
  ]);
}

export async function deleteTask(id: number): Promise<void> {
  await getDriver().runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  await removeAutoPostponeIds([id]);
}

export async function deleteTaskGroup(repeatGroupId: string): Promise<void> {
  const rows = await getDriver().getAllAsync<{ id: number }>(
    'SELECT id FROM tasks WHERE repeat_group_id = ?',
    [repeatGroupId]
  );
  await getDriver().runAsync('DELETE FROM tasks WHERE repeat_group_id = ?', [repeatGroupId]);
  if (rows.length > 0) await removeAutoPostponeIds(rows.map((row) => row.id));
}

// —— 未完成自动顺延（零表结构改动：ID 列表存在 settings 表的字符串里） ——

const AUTO_POSTPONE_KEY = 'tasks.autoPostponeIds';

/** 读取开启了自动延期的任务 ID；数据损坏时按空集合处理。 */
export async function getAutoPostponeIds(): Promise<number[]> {
  const raw = await getSetting(AUTO_POSTPONE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0
    );
  } catch {
    return [];
  }
}

async function saveAutoPostponeIds(ids: number[]): Promise<void> {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) {
    await deleteSetting(AUTO_POSTPONE_KEY);
    return;
  }
  await setSetting(AUTO_POSTPONE_KEY, JSON.stringify(unique));
}

async function addAutoPostponeIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const current = await getAutoPostponeIds();
  await saveAutoPostponeIds([...current, ...ids]);
}

async function removeAutoPostponeIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const current = await getAutoPostponeIds();
  if (current.length === 0) return;
  const removed = new Set(ids);
  const next = current.filter((id) => !removed.has(id));
  if (next.length === current.length) return;
  await saveAutoPostponeIds(next);
}

/** 某个任务是否开启了「未完成自动延期」。 */
export async function isTaskAutoPostpone(id: number): Promise<boolean> {
  return (await getAutoPostponeIds()).includes(id);
}

/** 编辑任务时切换自动延期开关。 */
export async function setTaskAutoPostpone(id: number, enabled: boolean): Promise<void> {
  if (enabled) {
    await addAutoPostponeIds([id]);
    return;
  }
  await removeAutoPostponeIds([id]);
}

/**
 * 把开启了自动延期、且 `date < today` 还没完成的任务顺延到今天。
 * 在今日列表加载前调用；返回是否真正迁移过，方便调用方决定是否刷新。
 */
export async function rolloverAutoPostponeTasks(today: string = todayStr()): Promise<boolean> {
  const ids = await getAutoPostponeIds();
  if (ids.length === 0) return false;

  const placeholders = ids.map(() => '?').join(', ');
  const rows = await getDriver().getAllAsync<TaskRow>(
    `SELECT * FROM tasks WHERE done = 0 AND date < ? AND id IN (${placeholders})
     ORDER BY date ASC, sort_order ASC, id ASC`,
    [today, ...ids]
  );
  if (rows.length === 0) return false;

  for (const task of rows) {
    await moveTaskToDate(task.id, today);
  }
  return true;
}
