/** 表单校验与输入解析（纯函数，便于测试）。 */

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

/** 空字符串表示"不设置时间"；格式不合法返回 error。 */
export function parseTimeInput(input: string): { value: string | null; error: string | null } {
  const trimmed = input.trim();
  if (trimmed === '') return { value: null, error: null };
  if (!isValidTime(trimmed)) {
    return { value: null, error: '时间格式应为 09:00' };
  }
  return { value: trimmed, error: null };
}



export function validateTaskTitle(title: string): string | null {
  if (title.trim() === '') return '任务内容不能为空';
  if (title.trim().length > 120) return '任务内容最多 120 个字';
  return null;
}



export function validateGameName(name: string): string | null {
  if (name.trim() === '') return '游戏名不能为空';
  if (name.trim().length > 60) return '游戏名最多 60 个字';
  return null;
}

/** 游玩时长按分钟计，要求 1~1440 分钟。 */
export function validateDurationMinutes(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes <= 0) return '请填写游玩时长';
  if (minutes > 24 * 60) return '单次时长不能超过 24 小时';
  return null;
}

export function validateRating(rating: number): string | null {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return '请选择 1~5 星';
  return null;
}

export function parseDurationInput(hours: string, minutes: string): { value: number; error: string | null } {
  const h = hours.trim() === '' ? 0 : Number(hours);
  const m = minutes.trim() === '' ? 0 : Number(minutes);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0 || m >= 60) {
    return { value: 0, error: '时长格式不正确' };
  }
  return { value: h * 60 + m, error: null };
}
