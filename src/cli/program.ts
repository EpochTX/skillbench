import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Command, InvalidArgumentError, Option } from 'commander';

import { initializeConfig } from '../config/init.js';
import { loadConfig } from '../config/loader.js';
import { analyzeTarget } from '../core/analyze.js';
import { compareReports } from '../core/compare.js';
import type { AnalysisReport, Issue, Severity } from '../core/types.js';
import { severities } from '../core/types.js';
import { builtInRules } from '../rules/registry.js';
import { renderBadge } from '../reporters/badge.js';
import { renderComparison } from '../reporters/compare.js';
import { GitHubReporter } from '../reporters/github.js';
import { JsonReporter } from '../reporters/json.js';
import { renderRules } from '../reporters/rules.js';
import { SarifReporter } from '../reporters/sarif.js';
import {
  renderCompatibility,
  renderFixSuggestions,
  renderLint,
  renderScore,
  renderSecurity,
  renderTokens,
  TerminalReporter,
} from '../reporters/terminal.js';
import { redactPotentialSecrets } from '../utils/text.js';
import { VERSION } from '../version.js';

type OutputFormat = 'terminal' | 'json' | 'sarif' | 'github';
type View = 'scan' | 'score' | 'lint' | 'compat' | 'token' | 'security' | 'fix';

interface AnalysisOptions {
  format: OutputFormat;
  color: boolean;
  config?: string;
  output?: string;
  ci?: boolean;
  failOn?: Severity;
  dryRun?: boolean;
}

interface CompareOptions {
  format: 'terminal' | 'json';
  color: boolean;
  config?: string;
  output?: string;
  ci?: boolean;
  failOn?: Severity;
}

export function createProgram(): Command {
  const program = new Command()
    .name('skillbench')
    .description(
      'The open benchmark, linter and compatibility checker for AI Agent Skills.',
    )
    .version(VERSION);

  configureAnalysisCommand(
    program
      .command('scan')
      .argument('[target]', 'file or directory to scan', '.')
      .description('Run the complete static analysis suite.'),
    true,
  ).action(async (target: string, options: AnalysisOptions) => {
    await executeAnalysis(target, options, 'scan');
  });

  configureAnalysisCommand(
    program
      .command('score')
      .argument('[target]', 'file or directory to score', '.')
      .description('Show the overall and category scores.'),
  ).action(async (target: string, options: AnalysisOptions) => {
    await executeAnalysis(target, options, 'score');
  });

  configureAnalysisCommand(
    program
      .command('lint')
      .argument('[target]', 'file or directory to lint', '.')
      .description('List every deterministic rule finding.'),
    true,
  ).action(async (target: string, options: AnalysisOptions) => {
    await executeAnalysis(target, options, 'lint');
  });

  configureAnalysisCommand(
    program
      .command('fix')
      .argument('[target]', 'file or directory to inspect', '.')
      .description('Print safe fix suggestions without changing files.')
      .option('--dry-run', 'show proposed fixes without writing (v0.2 behavior)'),
  ).action(async (target: string, options: AnalysisOptions) => {
    await executeAnalysis(target, options, 'fix');
  });

  configureAnalysisCommand(
    program
      .command('compat')
      .argument('[target]', 'file or directory to check', '.')
      .description('Explain compatibility with supported coding agents.'),
  ).action(async (target: string, options: AnalysisOptions) => {
    await executeAnalysis(target, options, 'compat');
  });

  configureAnalysisCommand(
    program
      .command('token')
      .argument('[target]', 'file or directory to analyze', '.')
      .description('Estimate tokens, duplication, and instruction density.'),
  ).action(async (target: string, options: AnalysisOptions) => {
    await executeAnalysis(target, options, 'token');
  });

  configureAnalysisCommand(
    program
      .command('security')
      .argument('[target]', 'file or directory to inspect', '.')
      .description('Run only the security-focused report view.'),
    true,
  ).action(async (target: string, options: AnalysisOptions) => {
    await executeAnalysis(target, options, 'security');
  });

  program
    .command('compare')
    .alias('diff')
    .argument('<before>', 'baseline file or directory')
    .argument('<after>', 'candidate file or directory')
    .description('Compare two analyses and surface regressions and improvements.')
    .addOption(
      new Option('--format <format>', 'output format')
        .choices(['terminal', 'json'])
        .default('terminal'),
    )
    .option('-c, --config <path>', 'use a specific configuration file')
    .option('-o, --output <path>', 'write the rendered report to a file')
    .option('--no-color', 'disable ANSI colors')
    .option('--ci', 'fail only on newly introduced findings at the threshold')
    .option(
      '--fail-on <severity>',
      'lowest introduced severity that fails in CI',
      parseSeverity,
      'critical',
    )
    .action(async (before: string, after: string, options: CompareOptions) => {
      const config = await loadConfig(after, options.config);
      const [beforeReport, afterReport] = await Promise.all([
        analyzeTarget(before, { config }),
        analyzeTarget(after, { config }),
      ]);
      const comparison = compareReports(beforeReport, afterReport);
      await emitOutput(
        renderComparison(comparison, {
          format: options.format,
          color: options.color,
        }),
        options.output,
      );
      if (
        options.ci &&
        shouldFailIssues(comparison.issues.introduced, options.failOn ?? 'critical')
      ) {
        process.exitCode = 1;
      }
    });

  program
    .command('rules')
    .argument('[ruleId]', 'optional rule ID such as SB102')
    .description('List built-in rules or explain one rule.')
    .addOption(
      new Option('--format <format>', 'output format')
        .choices(['terminal', 'json'])
        .default('terminal'),
    )
    .option('--no-color', 'disable ANSI colors')
    .action(
      (
        ruleId: string | undefined,
        options: { format: 'terminal' | 'json'; color: boolean },
      ) => {
        writeOutput(
          renderRules(builtInRules, {
            format: options.format,
            color: options.color,
            ...(ruleId ? { ruleId } : {}),
          }),
        );
      },
    );

  program
    .command('init')
    .argument('[directory]', 'directory in which to create .skillbench.yml', '.')
    .description('Create a recommended SkillBench configuration.')
    .action(async (directory: string) => {
      const configPath = await initializeConfig(directory);
      writeOutput(`Created ${configPath}`);
    });

  program
    .command('badge')
    .argument('[target]', 'file or directory to score', '.')
    .description('Generate a static shields.io Markdown score badge.')
    .option('-c, --config <path>', 'use a specific configuration file')
    .action(async (target: string, options: { config?: string }) => {
      const report = await analyzeTarget(target, {
        ...(options.config ? { configPath: options.config } : {}),
      });
      writeOutput(renderBadge(report));
    });

  return program;
}

export async function runCli(argv = process.argv): Promise<void> {
  try {
    await createProgram().parseAsync(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`SkillBench error: ${redactPotentialSecrets(message)}\n`);
    process.exitCode = 2;
  }
}

function configureAnalysisCommand(command: Command, ci = false): Command {
  command
    .addOption(
      new Option('--format <format>', 'output format')
        .choices(['terminal', 'json', 'sarif', 'github'])
        .default('terminal'),
    )
    .option('-c, --config <path>', 'use a specific configuration file')
    .option('-o, --output <path>', 'write the rendered report to a file')
    .option('--no-color', 'disable ANSI colors');
  if (ci) {
    command
      .option('--ci', 'enable deterministic CI exit codes')
      .option(
        '--fail-on <severity>',
        'lowest severity that fails in CI',
        parseSeverity,
        'critical',
      );
  }
  return command;
}

async function executeAnalysis(
  target: string,
  options: AnalysisOptions,
  view: View,
): Promise<void> {
  const report = await analyzeTarget(target, {
    ...(options.config ? { configPath: options.config } : {}),
  });
  await emitOutput(renderView(report, options, view), options.output);
  if (options.ci && shouldFailIssues(report.issues, options.failOn ?? 'critical')) {
    process.exitCode = 1;
  }
}

function renderView(
  report: AnalysisReport,
  options: AnalysisOptions,
  view: View,
): string {
  if (options.format === 'json') return new JsonReporter().render(report);
  if (options.format === 'sarif') return new SarifReporter().render(report);
  if (options.format === 'github') return new GitHubReporter().render(report);
  if (view === 'score') return renderScore(report, options.color);
  if (view === 'lint') return renderLint(report, options.color);
  if (view === 'compat') return renderCompatibility(report, options.color);
  if (view === 'token') return renderTokens(report, options.color);
  if (view === 'security') return renderSecurity(report, options.color);
  if (view === 'fix') return renderFixSuggestions(report, options.color);
  return new TerminalReporter(options.color).render(report);
}

function shouldFailIssues(issues: readonly Issue[], threshold: Severity): boolean {
  const rank: Record<Severity, number> = {
    info: 0,
    warning: 1,
    error: 2,
    critical: 3,
  };
  return issues.some((entry) => rank[entry.severity] >= rank[threshold]);
}

function parseSeverity(value: string): Severity {
  if ((severities as readonly string[]).includes(value)) return value as Severity;
  throw new InvalidArgumentError(
    `Expected one of: ${severities.join(', ')}. Received: ${value}`,
  );
}

async function emitOutput(value: string, outputPath?: string): Promise<void> {
  if (!outputPath) {
    writeOutput(value);
    return;
  }
  const absolute = path.resolve(outputPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${value.trimEnd()}\n`, 'utf8');
  writeOutput(`Wrote ${absolute}`);
}

function writeOutput(value: string): void {
  process.stdout.write(`${value.trimEnd()}\n`);
}
