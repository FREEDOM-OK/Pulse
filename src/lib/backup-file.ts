import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { backupPickerTypes } from './backup-picker';

export interface SaveResult {
  message: string;
}

/** 见 `@/lib/backup-picker`：Android 放开类型过滤，避免 .json 备份被 MIME 挡掉。 */
const PICKER_TYPES = backupPickerTypes(Platform.OS);

/** 把备份写到缓存目录，然后调起系统分享面板让用户自己选保存位置。 */
export async function saveBackupFile(fileName: string, content: string): Promise<SaveResult> {
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: 'utf8' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: '保存备份文件（.json）',
      UTI: 'public.json',
    });
    return { message: `已生成备份：${fileName}` };
  }
  return { message: `备份已保存：${uri}` };
}

/** 选择备份文件并读回文本；用户取消返回 null。 */
export async function pickBackupText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: PICKER_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const text = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'utf8' });
  // 部分文件管理器会在文件开头写入 BOM，JSON.parse 不认，先去掉。
  return text.replace(/^\uFEFF/, '');
}

/** 导入/清空前自动备份到 App 私有目录，返回位置说明。 */
export async function saveAutoBackup(fileName: string, content: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}auto-backups/`;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // 目录已存在
  }
  await FileSystem.writeAsStringAsync(`${dir}${fileName}`, content, { encoding: 'utf8' });
  return `自动备份已保存到 App 私有目录/auto-backups/${fileName}`;
}
