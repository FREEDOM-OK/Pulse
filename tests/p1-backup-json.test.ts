import { describe, expect, it } from 'vitest';
import { BACKUP_APP_ID, BACKUP_VERSION, type BackupPayload } from '@/db/repositories/backup';
import {
  buildAutoBackupName,
  buildBackupFileName,
  parseBackupText,
  serializeBackup,
} from '@/lib/backup-text';
import { ANY_DOCUMENT, backupPickerTypes } from '@/lib/backup-picker';

const SAMPLE: BackupPayload = {
  app: BACKUP_APP_ID,
  schemaVersion: BACKUP_VERSION,
  exportedAt: '2026-11-06T10:00:00.000Z',
  data: {
    tasks: [{ id: 1, title: '写周报' }],
    exercises: [{ id: 1, name: '卧推' }],
    trainingItems: [],
    setRecords: [],
    events: [{ id: 1, type: 'meal', title: '牛肉面', amount: 28.5 }],
    wishlist: [],
    playedGames: [],
    memos: [],
    courses: [],
    courseSlots: [],
    courseExceptions: [],
    settings: { theme: 'dark', 'fitness.defaultReps': '12', 'profile.name': '小明' },
  },
};

describe('备份文件格式：导出与导入都使用 JSON', () => {
  it('导出的文件名以 .json 结尾', () => {
    expect(buildBackupFileName(new Date(2026, 10, 6))).toBe('生活App备份-2026-11-06.json');
  });

  it('自动备份的文件名也以 .json 结尾', () => {
    const name = buildAutoBackupName(new Date(2026, 10, 6, 9, 5, 7));
    expect(name.endsWith('.json')).toBe(true);
    expect(name).toContain('生活App备份-2026-11-06');
  });

  it('导出内容是可被 JSON.parse 直接读取的文本', () => {
    const text = serializeBackup(SAMPLE);
    expect(() => JSON.parse(text)).not.toThrow();
    expect(JSON.parse(text)).toEqual(SAMPLE);
  });

  it('导出再导入能原样还原数据', () => {
    expect(parseBackupText(serializeBackup(SAMPLE))).toEqual(SAMPLE);
  });

  it('内容正确时，文件被存成别的后缀（如 .md）也照样能导入', () => {
    // Android 上备份文件可能被文件管理器改名，导入只认 JSON 内容，不认扩展名。
    const text = serializeBackup(SAMPLE);
    expect(parseBackupText(text)).toEqual(SAMPLE);
  });

  it('带 BOM 的 JSON 也能导入', () => {
    const text = `\uFEFF${serializeBackup(SAMPLE)}`;
    expect(parseBackupText(text)).toEqual(SAMPLE);
  });

  it('不是 JSON 的文件会提示选择 .json 备份', () => {
    expect(() => parseBackupText('# 导入说明\n\n这是 Markdown')).toThrow(
      '请选择本 App 导出的 .json 备份文件'
    );
    expect(() => parseBackupText('')).toThrow('不是合法的 JSON');
  });

  it('是 JSON 但不是本 App 的备份仍会被拒绝', () => {
    expect(() => parseBackupText('{"hello":"world"}')).toThrow('这不是本 App 的备份文件');
  });
});

describe('备份文件选择器：Android 不会被 MIME 过滤挡住', () => {
  it('Android 放开全部类型，导出的 .json 一定能选中', () => {
    // 只按 application/json 过滤时，部分手机把 .json 报成 octet-stream 会被置灰，
    // 列表里只剩 text/plain 命中的 .md/.txt —— 这就是「导入只看得到 md」的原因。
    expect(backupPickerTypes('android')).toBe(ANY_DOCUMENT);
  });

  it('iOS 仍按 JSON / 纯文本过滤', () => {
    expect(backupPickerTypes('ios')).toEqual(['application/json', 'text/plain']);
  });
});
