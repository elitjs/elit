#!/usr/bin/env bash
set -euo pipefail

echo "[android-native-test] init"
bun run mobile:init

echo "[android-native-test] sync"
bun run mobile:sync

echo "[android-native-test] doctor --json (informational)"
bun run mobile:doctor || true

GENERATED_SCREEN_PATH="android/app/src/main/java/com/elit/androidnativeexample/ElitGeneratedScreen.kt"
if [[ ! -f "$GENERATED_SCREEN_PATH" ]]; then
  echo "[android-native-test] FAILED: generated screen missing at $GENERATED_SCREEN_PATH"
  exit 1
fi

TEXT_FIELD_COUNT=$(grep -o 'OutlinedTextField(' "$GENERATED_SCREEN_PATH" | wc -l | tr -d ' ')
if [[ "$TEXT_FIELD_COUNT" -lt 2 ]]; then
  echo "[android-native-test] FAILED: generated Compose output should contain two OutlinedTextField blocks"
  exit 1
fi

if ! grep -Fq 'Checkbox(' "$GENERATED_SCREEN_PATH"; then
  echo "[android-native-test] FAILED: generated Compose output is missing Checkbox("
  exit 1
fi

CHECKBOX_COUNT=$(grep -o 'Checkbox(' "$GENERATED_SCREEN_PATH" | wc -l | tr -d ' ')
if [[ "$CHECKBOX_COUNT" -lt 2 ]]; then
  echo "[android-native-test] FAILED: generated Compose output should contain two Checkbox blocks"
  exit 1
fi

if ! grep -Fq 'openUri("https://github.com/elitjs/elit")' "$GENERATED_SCREEN_PATH"; then
  echo "[android-native-test] FAILED: generated Compose output is missing openUri(...) for the external link"
  exit 1
fi

if ! grep -Fq 'ElitImagePlaceholder(' "$GENERATED_SCREEN_PATH"; then
  echo "[android-native-test] FAILED: generated Compose output is missing ElitImagePlaceholder("
  exit 1
fi

ASSET_PATH="android/app/src/main/assets/public/index.html"
if [[ ! -f "$ASSET_PATH" ]]; then
  echo "[android-native-test] FAILED: synced web asset missing at $ASSET_PATH"
  exit 1
fi

echo "[android-native-test] build android"
bun run mobile:build:android

echo "[android-native-test] PASS: scaffold, generation, and Android build completed"
