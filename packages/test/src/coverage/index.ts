export type { CoverageOptions, FileCoverage } from './types';
export {
    calculateUncoveredLines,
    getExecutedLines,
    initializeCoverageTracking,
    markFileAsCovered,
    markLineExecuted,
    resetCoverageTracking,
} from './tracking';
export { processCoverage } from './process';
export { generateTextReport } from './text-report';
export { generateHtmlReport } from './html-report';
export { generateCoverageFinalJson, generateCloverXml } from './machine-reports';