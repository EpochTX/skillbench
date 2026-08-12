import { spawnSync, type SpawnSyncOptionsWithStringEncoding } from 'node:child_process';
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

interface PackageMetadata {
  name: string;
  version: string;
}

const root = path.resolve(import.meta.dirname, '..');
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

await main();

async function main(): Promise<void> {
  const metadata = await readPackageMetadata();
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'skillbench-package-smoke-'));
  const packagesDirectory = path.join(workspace, 'packages');
  const consumerDirectory = path.join(workspace, 'consumer');

  try {
    await mkdir(packagesDirectory, { recursive: true });
    await mkdir(consumerDirectory, { recursive: true });

    run(pnpmCommand, ['pack', '--pack-destination', packagesDirectory], root);
    const archivePath = await findSingleArchive(packagesDirectory);

    await writeConsumerFiles(consumerDirectory, metadata);
    run(
      pnpmCommand,
      ['add', '--prefer-offline', '--ignore-scripts', '--save-exact', archivePath],
      consumerDirectory,
    );

    await assertInstalledPackageLayout(consumerDirectory, metadata.name);
    verifyRuntimeImport(consumerDirectory, metadata);
    verifyTypeDeclarations(consumerDirectory);
    verifyInstalledCli(consumerDirectory, metadata.version);
    verifyScanCommand(consumerDirectory);

    process.stdout.write(
      `Packed package smoke test passed for ${metadata.name}@${metadata.version}.\n`,
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function readPackageMetadata(): Promise<PackageMetadata> {
  const source = await readFile(path.join(root, 'package.json'), 'utf8');
  const parsed = JSON.parse(source) as Partial<PackageMetadata>;
  if (!parsed.name || !parsed.version) {
    throw new Error(
      'package.json must define name and version for package smoke tests.',
    );
  }
  return { name: parsed.name, version: parsed.version };
}

async function findSingleArchive(directory: string): Promise<string> {
  const entries = (await readdir(directory)).filter((entry) => entry.endsWith('.tgz'));
  if (entries.length !== 1 || !entries[0]) {
    throw new Error(
      `Expected exactly one packed .tgz archive, found ${entries.length}: ${entries.join(', ')}`,
    );
  }
  return path.join(directory, entries[0]);
}

async function writeConsumerFiles(
  consumerDirectory: string,
  metadata: PackageMetadata,
): Promise<void> {
  await writeFile(
    path.join(consumerDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'skillbench-package-smoke-consumer',
        private: true,
        type: 'module',
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  await writeFile(
    path.join(consumerDirectory, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        include: ['consumer.ts'],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  await writeFile(
    path.join(consumerDirectory, 'consumer.ts'),
    [
      `import { VERSION, analyzeTarget, runRuleBenchmark } from '${metadata.name}';`,
      `import type { AnalysisReport, RuleBenchmarkReport } from '${metadata.name}';`,
      '',
      'const version: string = VERSION;',
      'const analyze: typeof analyzeTarget = analyzeTarget;',
      'const benchmark: typeof runRuleBenchmark = runRuleBenchmark;',
      'let analysis: AnalysisReport | undefined;',
      'let benchmarkReport: RuleBenchmarkReport | undefined;',
      'void version;',
      'void analyze;',
      'void benchmark;',
      'void analysis;',
      'void benchmarkReport;',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    path.join(consumerDirectory, 'SKILL.md'),
    [
      '---',
      'name: package-smoke',
      'description: Verify the installed SkillBench package against a clean consumer fixture.',
      '---',
      '# Purpose',
      '',
      'Review repository instructions using deterministic local checks and report evidence.',
      '',
      '# Workflow',
      '',
      'Inspect relevant files, verify findings, and keep conclusions tied to observed evidence.',
      '',
      '# Output',
      '',
      'Return concise findings and verification details.',
      '',
    ].join('\n'),
    'utf8',
  );
}

async function assertInstalledPackageLayout(
  consumerDirectory: string,
  packageName: string,
): Promise<void> {
  const packageDirectory = path.join(consumerDirectory, 'node_modules', packageName);
  await Promise.all([
    access(path.join(packageDirectory, 'dist', 'index.js')),
    access(path.join(packageDirectory, 'dist', 'index.d.ts')),
    access(path.join(packageDirectory, 'dist', 'cli.js')),
    access(path.join(packageDirectory, 'README.md')),
    access(path.join(packageDirectory, 'README_EN.md')),
    access(path.join(packageDirectory, 'docs', 'API.md')),
    access(path.join(packageDirectory, 'LICENSE')),
  ]);

  for (const forbidden of ['src', 'tests', 'coverage']) {
    try {
      await access(path.join(packageDirectory, forbidden));
    } catch {
      continue;
    }
    throw new Error(`Packed package unexpectedly contains ${forbidden}/.`);
  }
}

function verifyRuntimeImport(
  consumerDirectory: string,
  metadata: PackageMetadata,
): void {
  const script = [
    `import * as api from ${JSON.stringify(metadata.name)};`,
    `if (api.VERSION !== ${JSON.stringify(metadata.version)}) throw new Error('VERSION mismatch');`,
    `if (api.builtInRules.length !== 24) throw new Error('builtInRules mismatch');`,
  ].join(' ');
  run(process.execPath, ['--input-type=module', '--eval', script], consumerDirectory);
}

function verifyTypeDeclarations(consumerDirectory: string): void {
  run(
    pnpmCommand,
    ['exec', 'tsc', '--project', path.join(consumerDirectory, 'tsconfig.json')],
    root,
  );
}

function verifyInstalledCli(consumerDirectory: string, expectedVersion: string): void {
  const version = runCapture(
    pnpmCommand,
    ['exec', 'skillbench', '--version'],
    consumerDirectory,
  );
  if (version.trim() !== expectedVersion) {
    throw new Error(
      `Installed CLI version mismatch: expected ${expectedVersion}, received ${version.trim()}.`,
    );
  }

  const rules = JSON.parse(
    runCapture(
      pnpmCommand,
      ['exec', 'skillbench', 'rules', '--format', 'json', '--no-color'],
      consumerDirectory,
    ),
  ) as unknown[];
  if (rules.length !== 24) {
    throw new Error(
      `Installed CLI returned ${rules.length} built-in rules instead of 24.`,
    );
  }
}

function verifyScanCommand(consumerDirectory: string): void {
  const output = runCapture(
    pnpmCommand,
    ['exec', 'skillbench', 'scan', 'SKILL.md', '--format', 'json', '--no-color'],
    consumerDirectory,
  );
  const report = JSON.parse(output) as {
    schemaVersion?: string;
    tool?: { name?: string };
  };
  if (report.schemaVersion !== '0.1' || report.tool?.name !== 'skillbench') {
    throw new Error('Installed CLI scan did not return the expected report contract.');
  }
}

function spawn(
  command: string,
  arguments_: string[],
  options: SpawnSyncOptionsWithStringEncoding,
) {
  return spawnSync(command, arguments_, {
    ...options,
    shell: process.platform === 'win32' && command === pnpmCommand,
  });
}

function run(command: string, arguments_: string[], cwd: string): void {
  const result = spawn(command, arguments_, {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
    env: { ...process.env, NO_COLOR: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${arguments_.join(' ')} failed with exit code ${String(result.status)}.`,
    );
  }
}

function runCapture(command: string, arguments_: string[], cwd: string): string {
  const result = spawn(command, arguments_, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${arguments_.join(' ')} failed with exit code ${String(result.status)}: ${result.stderr}`,
    );
  }
  return result.stdout;
}
