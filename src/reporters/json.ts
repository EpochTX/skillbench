import type { AnalysisReport } from '../core/types.js';
import type { Reporter } from './types.js';

export class JsonReporter implements Reporter {
  readonly id = 'json';

  render(report: AnalysisReport): string {
    return JSON.stringify(report, null, 2);
  }
}
