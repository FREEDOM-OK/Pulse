import { getDriver } from '../connection';
import type { CourseBackground, CourseExceptionRow, CourseRow, CourseSlotRow } from '../types';
import { nowIso } from '@/lib/date';
import { normalizeWeeks, periodsOverlap, weeksOverlap } from '@/lib/timetable';

export interface CourseSlot {
  id: number;
  weekday: number;
  startPeriod: number;
  endPeriod: number;
  /** 生效周次；空数组表示每周。 */
  weeks: number[];
}

export interface CourseWithSlots extends CourseRow {
  slots: CourseSlot[];
}

export interface CreateSlotInput {
  weekday: number;
  startPeriod: number;
  endPeriod: number;
  weeks: number[];
}

export interface CreateCourseInput {
  name: string;
  teacher?: string | null;
  room?: string | null;
  color?: string | null;
  note?: string | null;
  /** 课桌底色样式，缺省为纯色。 */
  background?: CourseBackground;
  slots: CreateSlotInput[];
}

function parseWeeks(raw: string): number[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeWeeks(parsed.filter((week): week is number => typeof week === 'number'));
  } catch {
    return [];
  }
}

function toSlot(row: CourseSlotRow): CourseSlot {
  return {
    id: row.id,
    weekday: row.weekday,
    startPeriod: row.start_period,
    endPeriod: row.end_period,
    weeks: parseWeeks(row.weeks),
  };
}

function groupSlots(courses: CourseRow[], slots: CourseSlotRow[]): CourseWithSlots[] {
  const byCourse = new Map<number, CourseSlot[]>();
  for (const row of slots) {
    const list = byCourse.get(row.course_id) ?? [];
    list.push(toSlot(row));
    byCourse.set(row.course_id, list);
  }
  return courses.map((course) => ({
    ...course,
    slots: (byCourse.get(course.id) ?? []).sort(
      (a, b) => a.weekday - b.weekday || a.startPeriod - b.startPeriod
    ),
  }));
}

export async function listCourses(): Promise<CourseWithSlots[]> {
  const driver = getDriver();
  const [courses, slots] = await Promise.all([
    driver.getAllAsync<CourseRow>('SELECT * FROM courses ORDER BY name ASC, id ASC'),
    driver.getAllAsync<CourseSlotRow>('SELECT * FROM course_slots ORDER BY id ASC'),
  ]);
  return groupSlots(courses, slots);
}

export async function listAllCourseSlots(): Promise<(CourseSlotRow & { course_name: string; course_color: string | null })[]> {
  return getDriver().getAllAsync<CourseSlotRow & { course_name: string; course_color: string | null }>(
    `SELECT s.*, c.name AS course_name, c.color AS course_color
       FROM course_slots s
       JOIN courses c ON c.id = s.course_id
      ORDER BY s.weekday ASC, s.start_period ASC, s.id ASC`
  );
}

export async function getCourse(id: number): Promise<CourseWithSlots | null> {
  const driver = getDriver();
  const course = await driver.getFirstAsync<CourseRow>('SELECT * FROM courses WHERE id = ?', [id]);
  if (!course) return null;
  const slots = await driver.getAllAsync<CourseSlotRow>(
    'SELECT * FROM course_slots WHERE course_id = ? ORDER BY weekday ASC, start_period ASC, id ASC',
    [id]
  );
  return { ...course, slots: slots.map(toSlot) };
}

async function insertSlots(courseId: number, slots: CreateSlotInput[], createdAt: string): Promise<void> {
  const driver = getDriver();
  for (const slot of slots) {
    const start = Math.max(1, Math.round(slot.startPeriod));
    const end = Math.max(start, Math.round(slot.endPeriod));
    await driver.runAsync(
      `INSERT INTO course_slots (course_id, weekday, start_period, end_period, weeks, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [courseId, Math.round(slot.weekday), start, end, JSON.stringify(normalizeWeeks(slot.weeks)), createdAt]
    );
  }
}

export async function createCourse(input: CreateCourseInput): Promise<number> {
  const driver = getDriver();
  const createdAt = nowIso();
  let courseId = 0;
  await driver.withTransactionAsync(async () => {
    const result = await driver.runAsync(
      `INSERT INTO courses (name, teacher, room, color, note, background, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.teacher ?? null,
        input.room ?? null,
        input.color ?? null,
        input.note ?? null,
        input.background ?? 'plain',
        createdAt,
      ]
    );
    courseId = result.lastInsertRowId;
    await insertSlots(courseId, input.slots, createdAt);
  });
  return courseId;
}

export async function updateCourse(id: number, input: CreateCourseInput): Promise<void> {
  const driver = getDriver();
  await driver.withTransactionAsync(async () => {
    await driver.runAsync(
      'UPDATE courses SET name = ?, teacher = ?, room = ?, color = ?, note = ?, background = ? WHERE id = ?',
      [
        input.name,
        input.teacher ?? null,
        input.room ?? null,
        input.color ?? null,
        input.note ?? null,
        input.background ?? 'plain',
        id,
      ]
    );
    await driver.runAsync('DELETE FROM course_slots WHERE course_id = ?', [id]);
    await insertSlots(id, input.slots, nowIso());
  });
}

export async function deleteCourse(id: number): Promise<void> {
  const driver = getDriver();
  await driver.withTransactionAsync(async () => {
    await driver.runAsync('DELETE FROM course_exceptions WHERE course_id = ?', [id]);
    await driver.runAsync('DELETE FROM course_slots WHERE course_id = ?', [id]);
    await driver.runAsync('DELETE FROM courses WHERE id = ?', [id]);
  });
}

// —— v1.2.1：按周跳过课程 ——

export interface CourseException {
  id: number;
  courseId: number;
  week: number;
}

export async function listCourseExceptions(): Promise<CourseException[]> {
  const rows = await getDriver().getAllAsync<CourseExceptionRow>(
    'SELECT * FROM course_exceptions ORDER BY course_id ASC, week ASC'
  );
  return rows.map((row) => ({ id: row.id, courseId: row.course_id, week: row.week }));
}

/** 某门课被跳过的周次列表。 */
export async function listExceptionsOfCourse(courseId: number): Promise<number[]> {
  const rows = await getDriver().getAllAsync<{ week: number }>(
    'SELECT week FROM course_exceptions WHERE course_id = ? ORDER BY week ASC',
    [courseId]
  );
  return rows.map((row) => row.week);
}

/** 记录「这门课第 week 周不上课」；重复写入不会报错。 */
export async function addCourseException(courseId: number, week: number): Promise<void> {
  const safeWeek = Math.max(1, Math.round(week));
  await getDriver().runAsync(
    'INSERT OR IGNORE INTO course_exceptions (course_id, week, created_at) VALUES (?, ?, ?)',
    [courseId, safeWeek, nowIso()]
  );
}

export async function removeCourseException(courseId: number, week: number): Promise<void> {
  await getDriver().runAsync('DELETE FROM course_exceptions WHERE course_id = ? AND week = ?', [
    courseId,
    Math.max(1, Math.round(week)),
  ]);
}

export interface SlotConflictInput {
  weekday: number;
  startPeriod: number;
  endPeriod: number;
  weeks: number[];
}

/** 查找与给定时段冲突的课程（同星期、节次重叠、周次重叠）；excludeCourseId 用于编辑时排除自身。 */
export async function findSlotConflict(
  slot: SlotConflictInput,
  excludeCourseId?: number
): Promise<CourseWithSlots | null> {
  const courses = await listCourses();
  for (const course of courses) {
    if (excludeCourseId !== undefined && course.id === excludeCourseId) continue;
    for (const existing of course.slots) {
      if (existing.weekday !== slot.weekday) continue;
      if (!weeksOverlap(existing.weeks, normalizeWeeks(slot.weeks))) continue;
      if (
        !periodsOverlap(
          { start: existing.startPeriod, end: existing.endPeriod },
          { start: slot.startPeriod, end: slot.endPeriod }
        )
      ) {
        continue;
      }
      return course;
    }
  }
  return null;
}