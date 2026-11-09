/**
 * 复制课程时的命名规则（PRDv1.2.2 第 5.4 节）：原名 + 副本，重复复制递增编号。
 */
export function copyCourseName(name: string): string {
  const trimmed = name.trim() || '课程';
  const base = trimmed.replace(/ 副本( \d+)?$/, '');
  return `${base} 副本`;
}