import { generateBenchmarkFixtures } from './corpus/generate-fixtures.js';

export default async function globalSetup(): Promise<void> {
  await generateBenchmarkFixtures();
}
