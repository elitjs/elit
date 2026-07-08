import type { BuildOptions } from './contracts';
import { formatBytes } from './helpers';

export function logBuildInfo(config: BuildOptions, outputPath: string): void {
    console.log('\n🔨 Building...');
    console.log(`  Entry:  ${config.entry}`);
    console.log(`  Output: ${outputPath}`);
    console.log(`  Format: ${config.format}`);
    console.log(`  Target: ${config.target}`);
}

export function logBuildSuccess(buildTime: number, size: number): void {
    console.log('\n✅ Build successful!');
    console.log(`  Time: ${buildTime}ms`);
    console.log(`  Size: ${formatBytes(size)}`);
}

export function logMetafileSummary(result: any): void {
    if (!result?.metafile) {
        return;
    }

    const inputs = Object.keys(result.metafile.inputs).length;
    console.log(`  Files: ${inputs} input(s)`);

    const outputKeys = Object.keys(result.metafile.outputs);
    if (outputKeys.length === 0) {
        return;
    }

    const mainOutput = result.metafile.outputs[outputKeys[0]];
    if (!mainOutput?.inputs) {
        return;
    }

    const sortedInputs = Object.entries(mainOutput.inputs)
        .sort(([, a], [, b]) => {
            const aBytes = (a as any).bytesInOutput || 0;
            const bBytes = (b as any).bytesInOutput || 0;
            return bBytes - aBytes;
        })
        .slice(0, 5);

    if (sortedInputs.length === 0) {
        return;
    }

    console.log('\n  📊 Top 5 largest modules:');
    sortedInputs.forEach(([file, info]) => {
        const fileName = file.split(/[/\\]/).pop() || file;
        const infoBytes = (info as any).bytesInOutput || 0;
        console.log(`     ${fileName.padEnd(30)} ${formatBytes(infoBytes)}`);
    });
}