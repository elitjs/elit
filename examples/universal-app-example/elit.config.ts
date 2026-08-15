import { defineConfig } from '@elitjs/config';

const desktopBinaryPath = process.env.ELIT_DESKTOP_BINARY_PATH;
const desktopNativeBinaryPath = process.env.ELIT_DESKTOP_NATIVE_BINARY_PATH;
const desktopCargoTargetDir = process.env.ELIT_DESKTOP_CARGO_TARGET_DIR;

export default defineConfig({
    build: [{
        entry: './src/web-main.ts',
        outDir: './dist',
        outFile: 'main.js',
        format: 'esm',
        minify: false,
        sourcemap: true,
        target: 'es2020',
        copy: [
            {
                from: './public/index.html',
                to: './index.html',
                transform: (content) => content
                    .replace('/examples/universal-app-example/src/web-main.ts', './main.js')
                    .replace('/examples/universal-app-example/public/favicon.svg', './favicon.svg'),
            },
            {
                from: './public/favicon.svg',
                to: './favicon.svg',
            },
        ],
    }],
    desktop: {
        ...(desktopBinaryPath ? { binaryPath: desktopBinaryPath } : {}),
        ...(desktopNativeBinaryPath ? { nativeBinaryPath: desktopNativeBinaryPath } : {}),
        ...(desktopCargoTargetDir ? { cargoTargetDir: desktopCargoTargetDir } : {}),
        compiler: 'auto',
        entry: './src/web-main.ts',
        mode: 'hybrid',
        native: {
            entry: './src/web-main.ts',
        },
        outDir: './desktop-dist',
        runtime: 'quickjs',
    },
    dev: {
        port: 3070,
        host: 'localhost',
        open: false,
        logging: true,
        outDir: './dev-dist',
        outFile: 'index.js',
        root: '../..',
        basePath: '',
        index: './examples/universal-app-example/public/index.html',
    },
    mobile: {
        cwd: '.',
        appId: 'com.elit.universalexample',
        appName: 'ElitUniversalExample',
        webDir: 'dist',
        mode: 'native',
        permissions: [
            'android.permission.INTERNET',
            'android.permission.ACCESS_NETWORK_STATE',
        ],
        native: {
            entry: './src/web-main.ts',
            ios: {
                enabled: false,
            },
        },
    },
    preview: {
        port: 4170,
        host: 'localhost',
        open: false,
        logging: true,
        root: './dist',
        basePath: '',
        index: './index.html',
    },
});
