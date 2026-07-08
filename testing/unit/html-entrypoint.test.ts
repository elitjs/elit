/// <reference path="../../packages/test/src/globals.d.ts" />

import fs from 'node:fs';
import { resolve } from 'node:path';

interface EntrypointFixture {
    label: string;
    publicIndexPath: string;
    mainPath: string;
    clientPath: string;
}

const fixtures: EntrypointFixture[] = [
    {
        label: 'full-db example',
        publicIndexPath: 'examples/full-db/public/index.html',
        mainPath: 'examples/full-db/src/main.ts',
        clientPath: 'examples/full-db/src/client.ts',
    },
    {
        label: 'create-elit template',
        publicIndexPath: 'packages/create-elit/src/templates/public/index.html',
        mainPath: 'packages/create-elit/src/templates/src/main.ts',
        clientPath: 'packages/create-elit/src/templates/src/client.ts',
    },
];

describe('HTML entrypoint mount points', () => {
    for (const fixture of fixtures) {
        it(`keeps ${fixture.label} HTML and client mount ids aligned`, () => {
            const publicIndexHtml = fs.readFileSync(resolve(process.cwd(), fixture.publicIndexPath), 'utf8');
            const mainSource = fs.readFileSync(resolve(process.cwd(), fixture.mainPath), 'utf8');
            const clientSource = fs.readFileSync(resolve(process.cwd(), fixture.clientPath), 'utf8');

            expect(publicIndexHtml).toContain('id="app"');
            expect(publicIndexHtml).not.toContain('id="root"');
            expect(mainSource).toContain("#app");
            expect(clientSource).toContain("id: 'app'");
        });
    }
});