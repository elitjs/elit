# @elitjs/test

Jest-based test runner integration for Elit projects. Extracted from [elit](https://github.com/elitjs/elit) as a standalone package.

## Install

```bash
npm install @elitjs/test
```

## Usage

```bash
elit test --run                     # run everything once
elit test --run --file ./testing/unit/my.test.ts
```

### Retries

Flaky tests are retried before being reported as failed — hooks re-run per attempt:

```bash
elit test --run --retries 2
```

Or in `elit.config.ts`:

```ts
export default { test: { retries: 2 } };
```

### Snapshot testing

```ts
it('renders the summary', () => {
    expect({ items: 3, sorted: true }).toMatchSnapshot();
});
```

Baselines live in `__snapshots__/<file>.snap.json` next to the test file. Object keys are sorted, so key order never breaks a snapshot.

```bash
elit test --run                     # compares against baselines
elit test --run --update-snapshots  # (re)records them
```

### Parallel workers

Test files run across worker threads, each with an isolated module registry:

```bash
elit test --run --workers 4
```

Or `test: { workers: 4 }` in `elit.config.ts`. Coverage runs fall back to serial automatically.

### Run control

```bash
elit test --list                  # list matching tests without running
elit test --repeat-each 3         # run every test 3 times
elit test --grep-invert slow      # exclude tests whose names match
elit test --shard 1/3             # CI matrix: run the first third of the files
elit test --pass-with-no-tests    # don't fail when nothing matches
```

### Reporters

```bash
elit test --reporter junit        # writes junit.xml for CI ingestion
elit test --reporter html         # writes e2e-report/index.html (open via elit e2e show-report)
```

### webServer & global hooks (elit.config.ts)

```ts
export default {
    test: {
        webServer: {
            command: 'elit dev',          // started before the run, stopped after
            port: 5180,
            reuseExistingServer: true,
        },
        globalSetup: './global-setup.ts',      // default export, runs once first
        globalTeardown: './global-teardown.ts',
    },
};
```

### One-shot page capture

```bash
elit e2e screenshot http://localhost:5180 home.png --full-page
elit e2e pdf http://localhost:5180 report.pdf
elit e2e open http://localhost:5180
```

### UI mode

Run tests interactively from the browser — file list with checkboxes, run/re-run buttons, and live pass/fail status per test:

```bash
elit test --ui            # or: elit e2e --ui [port]
```

The page polls a local HTTP API (`/api/state`, `POST /api/run`), so results stream in as tests finish.

### Exit codes

`elit test` exits non-zero when any test fails, so CI pipelines can gate on it.

## License

MIT
