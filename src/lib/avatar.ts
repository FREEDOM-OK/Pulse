import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { avatarExtension, avatarFilePath } from './avatar-path';

export { AVATAR_DIR, avatarExtension, avatarFilePath } from './avatar-path';

/** 打开相册选一张图；用户取消返回 null。 */
export async function pickAvatarImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('需要相册权限才能更换头像');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}

/** 把选中的图片复制到 App 私有目录；Web 上无法复制时退回原 uri。 */
export async function persistAvatar(sourceUri: string): Promise<string> {
  const target = avatarFilePath(avatarExtension(sourceUri), FileSystem.documentDirectory);
  if (!target) return sourceUri;
  const dir = target.slice(0, target.lastIndexOf('/') + 1);
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // 目录已存在
  }
  // 旧头像可能是别的扩展名，先清掉再复制，避免留下孤儿文件。
  try {
    const existing = await FileSystem.readDirectoryAsync(dir);
    await Promise.all(
      existing
        .filter((name) => name.startsWith('avatar.'))
        .map((name) => FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true }))
    );
  } catch {
    // 目录还没建立
  }
  await FileSystem.copyAsync({ from: sourceUri, to: target });
  return target;
}

/** 删除头像文件；清空数据时调用。 */
export async function deleteAvatarFile(uri: string | null): Promise<void> {
  if (!uri || !uri.startsWith('file')) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // 文件不存在就算了
  }
}