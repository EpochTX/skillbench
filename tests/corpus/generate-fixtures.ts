import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const generatedCorpusDirectory = path.resolve(
  '.skillbench-output/benchmark-fixtures',
);

export async function generateBenchmarkFixtures(): Promise<void> {
  await rm(generatedCorpusDirectory, { recursive: true, force: true });
  await mkdir(generatedCorpusDirectory, { recursive: true });

  await Promise.all([
    writeFixture('vague.txt', vagueInstruction()),
    writeFixture('emphasis.txt', emphasisInstruction()),
    writeFixture('repeated-directives.txt', repeatedDirectivesInstruction()),
    writeFixture('markdown-noise.txt', markdownNoiseInstruction()),
    writeFixture('weak-structure.txt', weakStructureInstruction()),
    writeFixture('oversized-paragraph.txt', oversizedParagraphInstruction()),
    writeFixture('oversized-section.txt', oversizedSectionInstruction()),
    writeFixture('long-instruction.txt', longInstruction()),
    writeFixture('examples-dominant.txt', examplesDominantInstruction()),
    writeFixture(
      'platform-metadata/SKILL.md',
      skillWithPlatformMetadata(),
    ),
    writeFixture('scoped/.cursor/rules/invalid.mdc', baselineInstruction()),
  ]);
}

async function writeFixture(relativePath: string, content: string): Promise<void> {
  const filePath = path.join(generatedCorpusDirectory, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${content.trimEnd()}\n`, 'utf8');
}

function baselineInstruction(): string {
  return [
    '# Purpose',
    '',
    'This instruction defines a clear task for reviewing repository changes and producing evidence-based results for the user.',
    '',
    '# Workflow',
    '',
    'Inspect relevant context, compare behavior with documented requirements, verify conclusions with deterministic checks, and record concrete evidence.',
    '',
    '# Output',
    '',
    'Return a concise summary containing findings, verification evidence, and any remaining uncertainty.',
  ].join('\n');
}

function vagueInstruction(): string {
  return [
    baselineInstruction(),
    '',
    '# Conditions',
    '',
    'Maybe choose the first approach; perhaps choose the second; ideally keep both available; generally prefer the simpler path; probably verify twice; usually report details; if possible add context; try to compare alternatives; maybe defer uncertain work; perhaps ask for another signal.',
  ].join('\n');
}

function emphasisInstruction(): string {
  return [
    baselineInstruction(),
    '',
    '# Priorities',
    '',
    'MUST preserve scope.',
    'ALWAYS report observed behavior.',
    'NEVER invent results.',
    'IMPORTANT evidence must remain attributable.',
    'CRITICAL blockers must remain visible.',
    'MUST keep changes focused.',
    'ALWAYS include verification evidence.',
    'NEVER expose confidential values.',
    'IMPORTANT uncertainty must be stated.',
    'CRITICAL release assumptions must be explicit.',
  ].join('\n');
}

function repeatedDirectivesInstruction(): string {
  const directives = Array.from(
    { length: 18 },
    (_, index) =>
      `Ensure that check item ${index + 1} remains scoped to evidence marker ${index + 1}.`,
  );
  return [baselineInstruction(), '', '# Invariants', '', ...directives].join('\n');
}

function markdownNoiseInstruction(): string {
  const separators = Array.from({ length: 10 }, () => '---');
  return [baselineInstruction(), '', '# Decorative Area', '', ...separators].join('\n\n');
}

function weakStructureInstruction(): string {
  const entries = Array.from(
    { length: 45 },
    (_, index) => `Ref ${index + 1}: item${index + 1} note${index + 1}.`,
  );
  return ['# Purpose', '', ...entries.flatMap((entry) => [entry, ''])].join('\n');
}

function oversizedParagraphInstruction(): string {
  const words = Array.from(
    { length: 340 },
    (_, index) => `segment${String(index + 1).padStart(4, '0')}`,
  );
  return [baselineInstruction(), '', '# Dense Reference', '', words.join(' ')].join('\n');
}

function oversizedSectionInstruction(): string {
  const entries = shortEntries(101, 'section');
  return [
    '# Purpose',
    '',
    ...entries.flatMap((entry) => [entry, '']),
    '# Workflow',
    '',
    'Review the indexed reference items and retain only evidence needed for the current task.',
    '',
    '# Output',
    '',
    'Return verified findings with concise evidence.',
  ].join('\n');
}

function longInstruction(): string {
  const sections = ['Purpose', 'Workflow', 'Constraints', 'Output'];
  return sections
    .flatMap((title, sectionIndex) => [
      `# ${title}`,
      '',
      ...shortEntries(70, `s${sectionIndex + 1}`).flatMap((entry) => [entry, '']),
    ])
    .join('\n');
}

function examplesDominantInstruction(): string {
  const exampleLines = Array.from(
    { length: 88 },
    (_, index) =>
      `sample${String(index + 1).padStart(3, '0')} value${String(index + 1).padStart(3, '0')} result${String(index + 1).padStart(3, '0')}`,
  );
  const chunks: string[] = [];
  exampleLines.forEach((line, index) => {
    chunks.push(line);
    if ((index + 1) % 8 === 0) chunks.push('');
  });
  return [
    baselineInstruction(),
    '',
    '# Examples',
    '',
    '```text',
    ...chunks,
    '```',
  ].join('\n');
}

function skillWithPlatformMetadata(): string {
  return [
    '---',
    'name: platform-metadata',
    'description: A portable Skill fixture with one deliberate vendor-specific metadata field for benchmark coverage.',
    'model: deterministic-test-model',
    '---',
    baselineInstruction(),
  ].join('\n');
}

function shortEntries(count: number, prefix: string): string[] {
  return Array.from(
    { length: count },
    (_, index) => `${prefix}${index + 1}: item${index + 1} note${index + 1}.`,
  );
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(path.resolve(invokedPath)).href) {
  await generateBenchmarkFixtures();
}
