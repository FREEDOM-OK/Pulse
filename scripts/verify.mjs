#!/usr/bin/env node
/**
 * 一键验证：单测 → 类型检查 → Lint。
 *
 * 之前每次验证要分别跑三条命令（每条都要重新启动一次 npx，还会各刷一遍 npm notice），
 * 现在一条 `npm run verify` 跑完，并在最后给出一句结论。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const binDir = path.resolve('node_modules', '.bin');
const env = {
  ...process.env,
  PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
};

/**
 * 优先用包的 JS 入口直接跑（node 启动，绕开 npx 和 .cmd 包装），
 * 入口不存在时退回 node_modules/.bin（Windows 需要 shell 才能执行 .cmd）。
 */
const steps = [
  { label: '单测', entry: 'node_modules/vitest/vitest.mjs', bin: 'vitest', args: ['run'] },
  { label: '类型检查', entry: 'node_modules/typescript/bin/tsc', bin: 'tsc', args: ['--noEmit'] },
  { label: 'Lint', entry: 'node_modules/expo/bin/cli', bin: 'expo', args: ['lint'] },
];

const startedAt = Date.now();
const failed = [];

for (const step of steps) {
  process.stdout.write(`\n▶ ${step.label}\n`);
  const entry = path.resolve(step.entry);
  const result = fs.existsSync(entry)
    ? spawnSync(process.execPath, [entry, ...step.args], { stdio: 'inherit', env })
    : spawnSync(step.bin, step.args, {
        stdio: 'inherit',
        env,
        shell: process.platform === 'win32',
      });
  if (result.status !== 0) failed.push(step.label);
}

const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

if (failed.length > 0) {
  console.error(`\n✗ 验证失败：${failed.join('、')}（${seconds}s）`);
  process.exit(1);
}

console.log(`\n✓ 全部通过：单测 / 类型检查 / Lint（${seconds}s）`);