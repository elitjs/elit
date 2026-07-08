$ErrorActionPreference = 'Stop'

Write-Host '[android-native-test] init'
bun run mobile:init

Write-Host '[android-native-test] sync'
bun run mobile:sync

Write-Host '[android-native-test] doctor --json (informational)'
$doctorOutput = bun run mobile:doctor
Write-Output $doctorOutput
if ($LASTEXITCODE -ne 0) {
    Write-Warning '[android-native-test] mobile doctor reported missing checks; continuing to generation/build validation.'
}

$generatedScreenPath = Join-Path $PWD 'android\app\src\main\java\com\elit\androidnativeexample\ElitGeneratedScreen.kt'
if (-not (Test-Path $generatedScreenPath)) {
    throw "[android-native-test] FAILED: generated screen missing at $generatedScreenPath"
}

$generatedScreen = Get-Content $generatedScreenPath -Raw
if (($generatedScreen.Split('OutlinedTextField(').Length - 1) -lt 2) {
    throw '[android-native-test] FAILED: generated Compose output should contain two OutlinedTextField blocks'
}

if (-not $generatedScreen.Contains('Checkbox(')) {
    throw '[android-native-test] FAILED: generated Compose output is missing Checkbox('
}

if (($generatedScreen.Split('Checkbox(').Length - 1) -lt 2) {
    throw '[android-native-test] FAILED: generated Compose output should contain two Checkbox blocks'
}

if (-not $generatedScreen.Contains('openUri("https://github.com/elitjs/elit")')) {
    throw '[android-native-test] FAILED: generated Compose output is missing openUri(...) for the external link'
}

if (-not $generatedScreen.Contains('ElitImagePlaceholder(')) {
    throw '[android-native-test] FAILED: generated Compose output is missing ElitImagePlaceholder('
}

$assetPath = Join-Path $PWD 'android\app\src\main\assets\public\index.html'
if (-not (Test-Path $assetPath)) {
    throw "[android-native-test] FAILED: synced web asset missing at $assetPath"
}

Write-Host '[android-native-test] build android'
bun run mobile:build:android

Write-Host '[android-native-test] PASS: scaffold, generation, and Android build completed'
