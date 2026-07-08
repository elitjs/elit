/// <reference path="../../packages/test/src/globals.d.ts" />

import { parseBuildArgs, parseBuildDevArgs, parseBuildPreviewArgs } from '../../packages/cli/src';

describe('cli build argument parsing', () => {
    it('parses regular build flags', () => {
        expect(parseBuildArgs([
            '-e', './src/main.ts',
            '-o', './dist',
            '-f', 'esm',
            '--no-minify',
            '--sourcemap',
            '--silent',
        ])).toEqual({
            entry: './src/main.ts',
            outDir: './dist',
            format: 'esm',
            minify: false,
            sourcemap: true,
            logging: false,
        });
    });

    it('parses build-dev arguments as a standalone dev build', () => {
        expect(parseBuildDevArgs([
            '-e', './src/main.ts',
            '-o', './dist',
            '-f', 'esm',
            '--dev-out-file', 'dev-index.js',
            '--no-minify',
            '--sourcemap',
            '--silent',
        ])).toEqual({
            entry: './src/main.ts',
            outDir: './dist',
            format: 'esm',
            standaloneDev: true,
            standaloneDevOutFile: 'dev-index.js',
            minify: false,
            sourcemap: true,
            logging: false,
        });
    });

    it('parses build-preview arguments as a standalone preview build', () => {
        expect(parseBuildPreviewArgs([
            '-e', './src/main.ts',
            '-o', './dist',
            '-f', 'esm',
            '--preview-out-file', 'preview-index.js',
            '--no-minify',
            '--sourcemap',
            '--silent',
        ])).toEqual({
            entry: './src/main.ts',
            outDir: './dist',
            format: 'esm',
            standalonePreview: true,
            standalonePreviewOutFile: 'preview-index.js',
            minify: false,
            sourcemap: true,
            logging: false,
        });
    });
});