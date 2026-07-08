# Elit Android Native Example

This example is an Android-first validation project for the native mobile flow in elit.

## What it validates

- `elit mobile init` can scaffold the native mobile project from this example
- `elit mobile sync` copies fallback web assets and generates Android Compose from the same Elit syntax
- generated Android code includes a real Compose `Checkbox` for `input({ type: 'checkbox' })`
- generated Android code opens absolute links with `LocalUriHandler.openUri(...)`
- generated Android code includes multiple `OutlinedTextField` inputs plus an `ElitImagePlaceholder` for richer native layout coverage
- `elit mobile build android` compiles the generated native UI through Gradle
- `bun run mobile:run:android:auto` selects an emulator first, otherwise the first connected Android device, then installs and launches the app

## Project layout

- `elit.config.json` contains Android-focused mobile defaults and disables native iOS generation
- `src/native-screen.ts` is the shared Elit UI source that becomes Compose during sync/build
- `web/index.html` is the fallback page copied into native assets
- `scripts/run-android-auto.ts` chooses a connected Android target and runs the app
- `test-android.ps1` and `test-android.sh` smoke-test scaffold, generation, and Android build

## Run it

```bash
bun install
bun run mobile:test:win
```

To install and launch on a connected emulator/device automatically:

```bash
bun run mobile:run:android:auto
```

On Linux or macOS:

```bash
bun install
bun run mobile:test:sh
```

## Manual commands

```bash
npx elit mobile init . --app-id com.elit.androidnativeexample --app-name ElitAndroidNativeExample --web-dir web
npx elit mobile sync --cwd . --web-dir web
npx elit mobile doctor --cwd . --json
npx elit mobile devices android --cwd . --json
npx elit mobile build android --cwd .
npx elit mobile run android --cwd . --target <device-id>
bun ./scripts/run-android-auto.ts
```

Generated Android native files land at:

- `android/app/src/main/java/com/elit/androidnativeexample/ElitGeneratedScreen.kt`
- `android/app/src/main/java/com/elit/androidnativeexample/ElitRuntimeConfig.kt`

## Notes

- `mobile init` currently creates both Android and iOS scaffold folders; this example disables native iOS generation in config so Android stays the focus.
- The smoke scripts treat `mobile doctor --json` as informational because some machines may not have a full Android toolchain installed yet.
- The auto-run helper prefers emulator ids like `emulator-5554` before falling back to a physical device.
- The smoke scripts fail if the generated Kotlin file is missing two `OutlinedTextField(` blocks, two `Checkbox(` blocks, `ElitImagePlaceholder(`, or `openUri("https://github.com/elitjs/elit")`.
