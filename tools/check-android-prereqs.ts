// Phase-C Android prereq checker.
//
// Per Phase A plan Task 1: ships now (before any Android code) so the test
// already exists at merge time. Phase C (Capacitor 8 wrapper + Android bearer
// transport via @aparajita/capacitor-secure-storage per ADR-0002) consumes
// the report this script prints.
//
// Pure Node, no external dependencies. Exits 0 when every required prereq is
// satisfied, 1 otherwise. "--json" prints a single JSON object (CI-friendly)
// and still honours the exit code.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform, release } from 'node:os';

export type PrereqStatus = 'present' | 'missing' | 'wrong-version';

export interface PrereqCheck {
  readonly id: string;
  readonly label: string;
  readonly status: PrereqStatus;
  readonly detected?: string;
  readonly hint?: string;
}

interface CommandProbe {
  readonly id: string;
  readonly label: string;
  readonly command: string;
  readonly args: readonly string[];
  /** Extra version-parse: take index 1 of the stdout split by whitespace. */
  readonly parseVersion?: boolean;
  readonly hintWhenMissing: string;
}

const PROBES: readonly CommandProbe[] = [
  {
    id: 'node',
    label: 'Node.js (>= 20.0.0)',
    command: 'node',
    args: ['--version'],
    parseVersion: true,
    hintWhenMissing: 'Install Node.js 20.x via nvm (`.nvmrc` pins 20.0.0).',
  },
  {
    id: 'pnpm',
    label: 'pnpm (>= 10.0.0)',
    command: 'pnpm',
    args: ['--version'],
    parseVersion: true,
    hintWhenMissing: 'Install pnpm 10 globally: `npm i -g pnpm@10`.',
  },
  {
    id: 'java',
    label: 'JDK (>= 17, for Android Gradle Plugin)',
    command: 'java',
    args: ['-version'],
    hintWhenMissing:
      'Install JDK 17 (Temurin / Zulu). Capacitor 8 + AGP 8 require JDK 17+.',
  },
  {
    id: 'android-sdk',
    label: 'Android SDK (ANDROID_HOME / ANDROID_SDK_ROOT)',
    command: 'echo', // shell-out substitute below
    args: [],
    hintWhenMissing:
      'Install Android Studio (command-line tools) and export ANDROID_HOME.',
  },
  {
    id: 'adb',
    label: 'adb (PATH)',
    command: 'adb',
    args: ['--version'],
    hintWhenMissing:
      'adb ships with Android platform-tools — add `$ANDROID_HOME/platform-tools` to PATH.',
  },
  {
    id: 'gradle',
    label: 'Gradle wrapper (lands with apps/android in Phase C)',
    command: 'gradle',
    args: ['--version'],
    hintWhenMissing:
      'Phase C commits the wrapper via `gradle wrapper`. Probe is informational until then.',
  },
];

function probe(p: CommandProbe): PrereqCheck {
  // ANDROID_HOME is a structural probe, not a command.
  if (p.id === 'android-sdk') {
    const home = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
    if (home && existsSync(home)) {
      return {
        id: p.id,
        label: p.label,
        status: 'present',
        detected: home,
      };
    }
    return {
      id: p.id,
      label: p.label,
      status: 'missing',
      hint: p.hintWhenMissing,
    };
  }

  const result = spawnSync(p.command, p.args, { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    return {
      id: p.id,
      label: p.label,
      status: 'missing',
      hint: p.hintWhenMissing,
    };
  }

  const stdout = (result.stdout ?? '') + (result.stderr ?? '');
  const detected = p.parseVersion ? stdout.trim().split(/\s+/)[1] : stdout.trim();

  if (p.id === 'node') {
    const ok = /^v?(?:2[0-9]|[3-9]\d)\./.test(detected ?? '');
    return {
      id: p.id,
      label: p.label,
      status: ok ? 'present' : 'wrong-version',
      detected,
      ...(ok ? {} : { hint: 'Bump your toolchain to Node >= 20.0.0.' }),
    };
  }

  if (p.id === 'pnpm') {
    const ok = /^1[0-9]\.|^9\./.test(detected ?? '') && /^10\./.test(detected ?? '');
    return {
      id: p.id,
      label: p.label,
      status: ok ? 'present' : 'wrong-version',
      detected,
      ...(ok ? {} : { hint: '`pnpm self-update 10` or reinstall pnpm@10.' }),
    };
  }

  return {
    id: p.id,
    label: p.label,
    status: 'present',
    detected,
  };
}

export function checkAndroidPrereqs(): readonly PrereqCheck[] {
  return PROBES.map(probe);
}

function formatHuman(checks: readonly PrereqCheck[]): string {
  const rows = checks.map((c) => {
    const status =
      c.status === 'present'
        ? 'OK    '
        : c.status === 'missing'
          ? 'MISS  '
          : 'WRONG ';
    return `${status} ${c.label}${c.detected ? `  (${c.detected})` : ''}${
      c.hint ? `\n         ${c.hint}` : ''
    }`;
  });
  const summary = `${platform()} ${release()}`;
  return `Android prereq check — host: ${summary}\n\n${rows.join('\n')}\n`;
}

function main(argv: readonly string[]): number {
  const checks = checkAndroidPrereqs();
  const json = argv.includes('--json');
  if (json) {
    process.stdout.write(JSON.stringify({ checks }, null, 2) + '\n');
  } else {
    process.stdout.write(formatHuman(checks) + '\n');
  }
  const blocking = checks.some((c) => c.status !== 'present');
  return blocking ? 1 : 0;
}

// Run only when executed as the entry script.
const isEntrypoint =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(`/${process.argv[1]}`);
if (isEntrypoint) {
  const code = main(process.argv.slice(2));
  if (code !== 0) process.exit(code);
}
