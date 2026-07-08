#!/usr/bin/env bash
set -euo pipefail

echo "[universal-test] web build"
bun run web:build

if [[ ! -f dist/index.html ]]; then
  echo "[universal-test] FAILED: missing built index at dist/index.html"
  exit 1
fi
if [[ ! -f dist/main.js ]]; then
  echo "[universal-test] FAILED: missing built script at dist/main.js"
  exit 1
fi
if [[ ! -f dist/favicon.svg ]]; then
  echo "[universal-test] FAILED: missing copied favicon at dist/favicon.svg"
  exit 1
fi

echo "[universal-test] desktop smoke"
bun run desktop:smoke

echo "[universal-test] mobile init"
bun run mobile:init

echo "[universal-test] mobile sync"
bun run mobile:sync

echo "[universal-test] mobile doctor --json (informational)"
bun run mobile:doctor || true

GENERATED_SCREEN_PATH="android/app/src/main/java/com/elit/universalexample/ElitGeneratedScreen.kt"
if [[ ! -f "$GENERATED_SCREEN_PATH" ]]; then
  echo "[universal-test] FAILED: generated mobile screen missing at $GENERATED_SCREEN_PATH"
  exit 1
fi
if ! grep -Fq 'OutlinedTextField(' "$GENERATED_SCREEN_PATH"; then
  echo "[universal-test] FAILED: generated mobile Compose output is missing OutlinedTextField("
  exit 1
fi
if ! grep -Fq 'Checkbox(' "$GENERATED_SCREEN_PATH"; then
  echo "[universal-test] FAILED: generated mobile Compose output is missing Checkbox("
  exit 1
fi
if ! grep -Fq 'ElitImagePlaceholder(' "$GENERATED_SCREEN_PATH"; then
  echo "[universal-test] FAILED: generated mobile Compose output is missing ElitImagePlaceholder("
  exit 1
fi
if ! grep -Fq 'openUri("https://github.com/elitjs/elit")' "$GENERATED_SCREEN_PATH"; then
  echo "[universal-test] FAILED: generated mobile Compose output is missing openUri(...)"
  exit 1
fi

echo "[universal-test] mobile build android"
bun run mobile:build:android

echo "[universal-test] PASS: web, desktop, and mobile smoke flow completed"
