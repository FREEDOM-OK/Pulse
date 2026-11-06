import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import { exportBackup, BackupError } from '@/db/repositories/backup';
import {
  buildAutoBackupName,
  buildBackupFileName,
  parseBackupText,
  serializeBackup,
} from '@/lib/backup-text';
import { createTask } from '@/db/repositories/tasks';

afterEach(() => {
  resetDriverForTests();
});

describe('P8 备份文件', () => {
  it('文件名带日期，自动备份名带时分秒', () => {
    const date = new Date(2026, 10, 6, 12, 3, 5);
    expect(buildBackupFileName(date)).toBe('生活App备份-2026-11-06.json');
    expect(buildAutoBackupName(date)).toBe('生活App备份-2026-11-06-120305.json');
  });

  it('序列化后可原样解析回来', async () => {
    await createTestContext();
    await createTask({ date: '2026-11-06', title: '写周报' });

    const payload = await exportBackup();
    const text = serializeBackup(payload);
    expect(text).toContain('"schemaVersion": 1');

    const parsed = parseBackupText(text);
    expect(parsed.data.tasks).toEqual(payload.data.tasks);
    expect(parsed.data.settings).toEqual(payload.data.settings);
  });

  it('非法内容给出明确的中文错误', () => {
    expect(() => parseBackupText('not-json')).toThrow(BackupError);
    expect(() => parseBackupText('not-json')).toThrow('不是合法的 JSON');
    expect(() => parseBackupText(JSON.stringify({ app: 'other', schemaVersion: 1 }))).toThrow(
      '这不是本 App 的备份文件'
    );
    expect(() =>
      parseBackupText(JSON.stringify({ app: 'my-life-app', schemaVersion: 99, data: {} }))
    ).toThrow('备份来自更新版本的 App');
  });
});
