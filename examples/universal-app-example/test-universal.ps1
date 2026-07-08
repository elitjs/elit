$ErrorActionPreference = 'Stop'

Write-Host '[universal-test] web build'
bun run web:build

$distIndex = Join-Path $PWD 'dist\index.html'
$distScript = Join-Path $PWD 'dist\main.js'
$distIcon = Join-Path $PWD 'dist\favicon.svg'
if (-not (Test-Path $distIndex)) {
    throw "[universal-test] FAILED: missing built index at $distIndex"
}
if (-not (Test-Path $distScript)) {
    throw "[universal-test] FAILED: missing built script at $distScript"
}
if (-not (Test-Path $distIcon)) {
    throw "[universal-test] FAILED: missing copied favicon at $distIcon"
}

Write-Host '[universal-test] desktop smoke'
bun run desktop:smoke

Write-Host '[universal-test] mobile init'
bun run mobile:init

Write-Host '[universal-test] mobile sync'
bun run mobile:sync

Write-Host '[universal-test] mobile doctor --json (informational)'
$doctorOutput = bun run mobile:doctor
Write-Output $doctorOutput
if ($LASTEXITCODE -ne 0) {
    Write-Warning '[universal-test] mobile doctor reported missing checks; continuing to build validation.'
}

$generatedScreenPath = Join-Path $PWD 'android\app\src\main\java\com\elit\universalexample\ElitGeneratedScreen.kt'
if (-not (Test-Path $generatedScreenPath)) {
    throw "[universal-test] FAILED: generated mobile screen missing at $generatedScreenPath"
}

$generatedScreen = Get-Content $generatedScreenPath -Raw
if (-not $generatedScreen.Contains('OutlinedTextField(')) {
    throw '[universal-test] FAILED: generated mobile Compose output is missing OutlinedTextField('
}
if (-not $generatedScreen.Contains('Checkbox(')) {
    throw '[universal-test] FAILED: generated mobile Compose output is missing Checkbox('
}
if (-not $generatedScreen.Contains('ElitImagePlaceholder(')) {
    throw '[universal-test] FAILED: generated mobile Compose output is missing ElitImagePlaceholder('
}
if (-not $generatedScreen.Contains('openUri("https://github.com/elitjs/elit")')) {
    throw '[universal-test] FAILED: generated mobile Compose output is missing openUri(...)'
}

Write-Host '[universal-test] mobile build android'
bun run mobile:build:android

Write-Host '[universal-test] PASS: web, desktop, and mobile smoke flow completed'
