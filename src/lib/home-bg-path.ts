/** 首页背景图文件相关的纯函数（不依赖 expo 模块，便于单测）。 */
export const HOME_BG_DIR = 'home';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];

/** 从相册返回的 uri 里取扩展名；无法识别时按 jpg 处理。 */
export function homeBgExtension(uri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri);
  const ext = match?.[1]?.toLowerCase();
  return ext && ALLOWED_EXTENSIONS.includes(ext) ? ext : 'jpg';
}

/** 背景图目标路径；documentDirectory 在 Web 上为空，此时返回 null。 */
export function homeBgFilePath(extension: string, documentDirectory: string | null): string | null {
  if (!documentDirectory) return null;
  return `${documentDirectory}${HOME_BG_DIR}/background.${extension}`;
}