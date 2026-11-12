import { getDriver } from '../connection';

export type SearchKind = 'task' | 'memo' | 'fitness';

export interface SearchResult {
  key: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  /** 记录所属日期，点击结果后带到详情页。 */
  date: string;
}

interface TaskSearchRow {
  id: number;
  date: string;
  title: string;
  note: string | null;
  time: string | null;
  done: number;
}

interface MemoSearchRow {
  id: number;
  date: string;
  content: string;
  time: string | null;
}

interface FitnessSearchRow {
  id: number;
  date: string;
  exercise_name: string;
  sets: number;
}

const PER_SOURCE_LIMIT = 24;
const RESULT_LIMIT = 30;
/** 搜索框为空时只展示最近 10 个关键词。 */
export const SEARCH_HISTORY_LIMIT = 10;

export interface SearchHistoryEntry {
  query: string;
  searchedAt: string;
}

/** 最近搜索关键词；空搜索面板只读这张表，不碰业务数据。 */
export async function listSearchHistory(limit = SEARCH_HISTORY_LIMIT): Promise<SearchHistoryEntry[]> {
  return getDriver().getAllAsync<{ query: string; searched_at: string }>(
    `SELECT query, searched_at
       FROM search_history
      ORDER BY searched_at DESC
      LIMIT ?`,
    [limit]
  ).then((rows) =>
    rows.map((row) => ({ query: row.query, searchedAt: row.searched_at }))
  );
}

/** 按回车后写入/更新搜索词。 */
export async function recordSearchQuery(rawQuery: string): Promise<void> {
  const query = rawQuery.trim();
  if (!query) return;
  await getDriver().runAsync(
    `INSERT INTO search_history (query, searched_at, hit_count)
     VALUES (?, ?, 1)
     ON CONFLICT(query) DO UPDATE SET
       searched_at = excluded.searched_at,
       hit_count = search_history.hit_count + 1`,
    [query, new Date().toISOString()]
  );
}

export async function clearSearchHistory(): Promise<void> {
  await getDriver().runAsync('DELETE FROM search_history');
}

/**
 * 搜索首页/计划页可见的业务数据：
 * - 计划：任务标题或备注；
 * - 备忘：备忘正文；
 * - 健身：已完成的训练记录（按日期 + 动作聚合）。
 *
 * 空关键词返回最近的记录，作为搜索面板的默认内容。
 */
export async function searchRecords(rawQuery: string): Promise<SearchResult[]> {
  const query = rawQuery.trim();
  const like = `%${query}%`;
  const driver = getDriver();

  const [tasks, memos, fitness] = await Promise.all([
    driver.getAllAsync<TaskSearchRow>(
      `SELECT id, date, title, note, time, done
       FROM tasks
       WHERE title LIKE ? OR COALESCE(note, '') LIKE ?
       ORDER BY date DESC, done ASC, sort_order ASC, id DESC
       LIMIT ?`,
      [like, like, PER_SOURCE_LIMIT]
    ),
    driver.getAllAsync<MemoSearchRow>(
      `SELECT id, date, content, time
       FROM memos
       WHERE content LIKE ?
       ORDER BY date DESC, pinned DESC, sort_order ASC, id DESC
       LIMIT ?`,
      [like, PER_SOURCE_LIMIT]
    ),
    driver.getAllAsync<FitnessSearchRow>(
      `SELECT MIN(id) AS id, date, exercise_name, COUNT(*) AS sets
       FROM set_records
       WHERE exercise_name LIKE ?
       GROUP BY date, exercise_name
       ORDER BY date DESC, exercise_name ASC
       LIMIT ?`,
      [like, PER_SOURCE_LIMIT]
    ),
  ]);

  const results: SearchResult[] = [
    ...tasks.map<SearchResult>((task) => ({
      key: `task-${task.id}`,
      kind: 'task',
      title: task.title,
      subtitle:
        task.done === 1
          ? task.time
            ? `已完成 · ${task.time}`
            : '已完成'
          : task.note || (task.time ? `计划 · ${task.time}` : '计划'),
      date: task.date,
    })),
    ...memos.map<SearchResult>((memo) => ({
      key: `memo-${memo.id}`,
      kind: 'memo',
      title: memo.content,
      subtitle: memo.time ? `备忘 · ${memo.time}` : '备忘',
      date: memo.date,
    })),
    ...fitness.map<SearchResult>((record) => ({
      key: `fitness-${record.date}-${record.exercise_name}`,
      kind: 'fitness',
      title: record.exercise_name,
      subtitle: `${Number(record.sets)} 组训练`,
      date: record.date,
    })),
  ];

  return results
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RESULT_LIMIT);
}