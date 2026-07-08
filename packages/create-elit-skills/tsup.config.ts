import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    clean: true,
    minify: false,
    shims: true,
    async onSuccess() {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { existsSync } = await import('fs');

        const skillsSrc = path.join(process.cwd(), 'src', 'skills');
        const skillsDest = path.join(process.cwd(), 'dist', 'skills');

        if (existsSync(skillsSrc)) {
            await fs.cp(skillsSrc, skillsDest, { recursive: true });
            console.log('Copied skills to dist/skills');
        }
    },
});
