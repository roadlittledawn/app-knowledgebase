/**
 * Minimal test harness. The project deliberately has no test framework
 * (see CLAUDE.md), so these scripts use node:assert and report themselves.
 */

let failures = 0;

export function log(line: string): void {
  process.stdout.write(`${line}\n`);
}

export async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    log(`  ok    ${name}`);
  } catch (err) {
    failures++;
    log(`  FAIL  ${name}`);
    log(`        ${(err as Error).message}`);
  }
}

export function finish(suite: string): never {
  if (failures === 0) {
    log(`\n${suite}: all tests passed.`);
    process.exit(0);
  }
  log(`\n${suite}: ${failures} test(s) failed.`);
  process.exit(1);
}
