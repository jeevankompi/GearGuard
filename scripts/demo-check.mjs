import { spawn } from 'node:child_process';
import process from 'node:process';

const cwd = process.cwd();

function npmCommand() {
  // Avoid PowerShell npm.ps1 execution policy issues by invoking the .cmd directly on Windows.
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function runStep(label, command, args, options = {}) {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line no-console
    console.log(`\n==> ${label}`);
    // eslint-disable-next-line no-console
    console.log(`$ ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) return resolve();
      reject(new Error(`${label} failed (exit ${code ?? 'unknown'})`));
    });
  });
}

async function main() {
  // Ensure emulator defaults for both backend + web smoke.
  const env = {
    ...process.env,
    FIREBASE_USE_EMULATORS: process.env.FIREBASE_USE_EMULATORS ?? 'true',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? 'gear-guard-demo',
    FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080',
    FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099',
  };

  const npm = npmCommand();

  // Web checks
  await runStep('web: lint', npm, ['--prefix', 'web', 'run', 'lint'], { cwd, env });
  await runStep('web: build', npm, ['--prefix', 'web', 'run', 'build'], { cwd, env });
  await runStep('web: smoke', npm, ['--prefix', 'web', 'run', 'smoke:web'], { cwd, env });

  // Backend checks
  await runStep('backend: seed', npm, ['run', 'seed'], { cwd, env });
  await runStep('backend: smoke', npm, ['run', 'smoke'], { cwd, env });

  // eslint-disable-next-line no-console
  console.log('\n✅ demo-check OK (web + backend + emulators)');
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('\n❌ demo-check FAILED');
  // eslint-disable-next-line no-console
  console.error(err?.stack || String(err));
  // eslint-disable-next-line no-console
  console.error(
    '\nIf this fails with connection errors, start emulators first (Firestore 8080, Auth 9099).\n' +
      'Tip: run the existing root script `emulators` in a separate terminal.'
  );
  process.exitCode = 1;
});
