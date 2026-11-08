import { describe, expect, it } from 'vitest';
import { avatarExtension, avatarFilePath } from '@/lib/avatar-path';

describe('P2 头像文件路径', () => {
  it('从相册 uri 取扩展名，识别不了的按 jpg', () => {
    expect(avatarExtension('file:///tmp/IMG_1.JPG')).toBe('jpg');
    expect(avatarExtension('file:///tmp/photo.png?size=2')).toBe('png');
    expect(avatarExtension('blob:http://localhost/abc')).toBe('jpg');
    expect(avatarExtension('file:///tmp/a.bmp')).toBe('jpg');
  });

  it('放进 App 私有目录的 profile/ 下', () => {
    expect(avatarFilePath('png', 'file:///data/')).toBe('file:///data/profile/avatar.png');
  });

  it('Web 上没有 documentDirectory 时返回 null（由调用方退回原 uri）', () => {
    expect(avatarFilePath('png', null)).toBeNull();
  });
});