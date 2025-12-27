import { spawn } from 'node:child_process';
import process from 'node:process';

/* eslint-disable no-console */

const cwd = process.cwd();

function npmCommand(): string {
  // Avoid PowerShell npm.ps1 execution policy issues by invoking the .cmd directly on Windows.
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function runStep(
  label: string,
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n==> ${label}`);
    console.log(`$ ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      cwd,
      env,
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) return resolve();
      reject(new Error(`${label} failed (exit ${code ?? 'unknown'})`));
    });
  });
}

async function main(): Promise<void> {
  // Ensure emulator defaults for both backend + web smoke.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    FIREBASE_USE_EMULATORS: process.env.FIREBASE_USE_EMULATORS ?? 'true',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? 'gear-guard-demo',
    FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080',
    FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099',
  };

  const npm = npmCommand();

  await runStep('web: lint', npm, ['--prefix', 'web', 'run', 'lint'], env);
  await runStep('web: build', npm, ['--prefix', 'web', 'run', 'build'], env);
  await runStep('web: smoke', npm, ['--prefix', 'web', 'run', 'smoke:web'], env);

  await runStep('backend: seed', npm, ['run', 'seed'], env);
  await runStep('backend: smoke', npm, ['run', 'smoke'], env);

  console.log('\n✅ demo-check OK (web + backend + emulators)');
}

main().catch(err => {
  console.error('\n❌ demo-check FAILED');
  console.error(err instanceof Error ? err.stack : String(err));
  console.error(
    '\nIf this fails with connection errors, start emulators first (Firestore 8080, Auth 9099).\n' +
      'Tip: run the existing root script `emulators` in a separate terminal.'
  );
  process.exitCode = 1;
});
