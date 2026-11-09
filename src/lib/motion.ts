/** 减弱动效时把动效时长压成 0；纯函数，方便单测。 */
export function motionDuration(ms: number, reduceMotion: boolean): number {
  return reduceMotion ? 0 : ms;
}