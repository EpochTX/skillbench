import type { Paragraph, ParsedDocument, TokenMetrics } from './types.js';
import { jaccard, lexicalUnits, ngrams, normalizeText } from '../utils/text.js';

export interface DuplicateMatch {
  original: Paragraph;
  duplicate: Paragraph;
  similarity: number;
}

const cjkRegex =
  /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/gu;

export class TokenEfficiencyAnalyzer {
  analyze(document: ParsedDocument): TokenMetrics {
    const characters = document.body.length;
    const cjkCharacters = document.body.match(cjkRegex)?.length ?? 0;
    const words = lexicalUnits(document.body).length;
    const estimatedTokens = estimateTokens(document.body);
    const duplicates = findDuplicateParagraphs(document.paragraphs);
    const duplicatedParagraphs = new Set(
      duplicates.map((match) => match.duplicate.startLine),
    );
    const duplicateTokens = document.paragraphs
      .filter((paragraph) => duplicatedParagraphs.has(paragraph.startLine))
      .reduce((sum, paragraph) => sum + estimateTokens(paragraph.text), 0);
    const redundancyRatio =
      estimatedTokens === 0 ? 0 : duplicateTokens / estimatedTokens;

    return {
      characters,
      words,
      cjkCharacters,
      estimatedTokens,
      duplicateTokens,
      redundancyRatio: round(redundancyRatio, 4),
      estimatedSavings: duplicateTokens,
      instructionDensity: instructionDensity(document.body),
    };
  }
}

export function estimateTokens(value: string): number {
  if (!value.trim()) return 0;
  const cjkCharacters = value.match(cjkRegex)?.length ?? 0;
  const withoutCjk = value.replace(cjkRegex, '');
  const latinAndNumbers = withoutCjk.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  const punctuation = withoutCjk.match(/[^\p{L}\p{N}\s]/gu)?.length ?? 0;
  return Math.max(
    1,
    Math.ceil(cjkCharacters / 1.5 + latinAndNumbers / 4 + punctuation / 3),
  );
}

export function findDuplicateParagraphs(paragraphs: Paragraph[]): DuplicateMatch[] {
  const candidates = paragraphs
    .filter((paragraph) => normalizeText(paragraph.text).length >= 48)
    .slice(0, 500)
    .map((paragraph) => ({
      paragraph,
      normalized: normalizeText(paragraph.text),
      grams: ngrams(paragraph.text),
    }));
  const matches: DuplicateMatch[] = [];
  const alreadyMarked = new Set<number>();

  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    const left = candidates[leftIndex];
    if (!left) continue;
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < candidates.length;
      rightIndex += 1
    ) {
      const right = candidates[rightIndex];
      if (!right || alreadyMarked.has(right.paragraph.startLine)) continue;
      const lengthRatio =
        Math.min(left.normalized.length, right.normalized.length) /
        Math.max(left.normalized.length, right.normalized.length);
      if (lengthRatio < 0.72) continue;

      const similarity =
        left.normalized === right.normalized ? 1 : jaccard(left.grams, right.grams);
      if (similarity >= 0.86) {
        matches.push({
          original: left.paragraph,
          duplicate: right.paragraph,
          similarity: round(similarity, 3),
        });
        alreadyMarked.add(right.paragraph.startLine);
      }
    }
  }
  return matches;
}

function instructionDensity(value: string): number {
  const lines = value.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return 0;
  const actionablePattern =
    /^\s*(?:[-*+]\s+|\d+[.)]\s+)?(?:always|never|must|should|use|run|check|create|write|read|return|avoid|ensure|ask|do|prefer|keep|when|if|使用|运行|检查|创建|编写|读取|返回|避免|确保|询问|必须|不要|始终|当)/iu;
  const actionable = lines.filter((line) => actionablePattern.test(line)).length;
  return round(actionable / lines.length, 4);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
