import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { homeBgExtension, homeBgFilePath } from './home-bg-path';

export { HOME_BG_DIR, homeBgExtension, homeBgFilePath } from './home-bg-path';

/**
 * 打开相册选一张首页背景图；用户取消返回 null。
 * 和头像一样要求 9:16 竖图，避免整屏铺开后被裁掉主体。
 */
export async function pickHomeBgImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('需要相册权限才能更换首页背景');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [9, 16],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}

/** 把选中的图片复制到 App 私有目录；Web 上无法复制时退回原 uri。 */
export async function persistHomeBgImage(sourceUri: string): Promise<string> {
  const target = homeBgFilePath(homeBgExtension(sourceUri), FileSystem.documentDirectory);
  if (!target) return sourceUri;
  const dir = target.slice(0, target.lastIndexOf('/') + 1);
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // 目录已存在
  }
  // 旧图可能是别的扩展名，先清掉再复制，避免留下孤儿文件。
  try {
    const existing = await FileSystem.readDirectoryAsync(dir);
    await Promise.all(
      existing
        .filter((name) => name.startsWith('background.'))
        .map((name) => FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true }))
    );
  } catch {
    // 目录还没建立
  }
  await FileSystem.copyAsync({ from: sourceUri, to: target });
  return target;
}

/** 删除首页背景图文件；换图与清空数据时调用。 */
export async function deleteHomeBgImage(uri: string | null): Promise<void> {
  if (!uri || !uri.startsWith('file')) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // 文件不存在就算了
  }
}