import {
  BackupError,
  parseBackupPayload,
  type BackupPayload,
} from '@/db/repositories/backup';

/** 备份文件名：生活App备份-2026-11-06.json */
export function buildBackupFileName(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `生活App备份-${year}-${month}-${day}.json`;
}

export function buildAutoBackupName(date: Date = new Date()): string {
  const base = buildBackupFileName(date).replace(/\.json$/, '');
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join('');
  return `${base}-${time}.json`;
}

export function serializeBackup(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

/** 解析备份文本：JSON 错误或结构不对都抛 BackupError。 */
export function parseBackupText(text: string): BackupPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new BackupError('文件内容不是合法的 JSON，请选择本 App 导出的 .json 备份文件');
  }
  return parseBackupPayload(raw);
}
