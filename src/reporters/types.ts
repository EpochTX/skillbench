import type { AnalysisReport } from '../core/types.js';

export interface Reporter {
  id: string;
  render(report: AnalysisReport): string;
}
