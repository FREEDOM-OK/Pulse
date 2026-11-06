import type { SaveResult } from './backup-file';

/** Web 预览环境：用浏览器下载代替分享面板。 */
export async function saveBackupFile(fileName: string, content: string): Promise<SaveResult> {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { message: `已导出：${fileName}` };
}

/** Web 预览环境：用隐藏的 file input 选文件。 */
export async function pickBackupText(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve(await file.text());
    };
    input.click();
  });
}

/** Web 预览环境：自动备份放 localStorage（只保留最近一次）。 */
export async function saveAutoBackup(fileName: string, content: string): Promise<string> {
  try {
    localStorage.setItem(
      'life-app-auto-backup',
      JSON.stringify({ fileName, content, savedAt: new Date().toISOString() })
    );
    return `自动备份已保存到浏览器本地存储（${fileName}）`;
  } catch {
    return '自动备份保存失败（浏览器存储空间不足）';
  }
}
