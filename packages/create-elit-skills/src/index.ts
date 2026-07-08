#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SKILLS_SRC = resolve(__dirname, 'skills');

const TARGET_DIRS = [
    '.claude/skills',
    '.agents/skills',
    '.github/skills',
];

const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHelp(): void {
    log('Usage: npm create elit-skills@latest [target-dir] [options]', 'cyan');
    log('');
    log('Scaffolds Elit.js AI skills into a project.');
    log('');
    log('Arguments:');
    log('  target-dir              Destination directory (default: current dir)', 'dim');
    log('');
    log('Options:');
    log('  --target <dirs>         Comma-separated subset of:', 'dim');
    log('                          .claude/skills,.agents/skills,.github/skills', 'dim');
    log('  --list                  List available skills and exit', 'dim');
    log('  --help, -h              Show this help', 'dim');
    log('');
    log('Examples:');
    log('  npm create elit-skills@latest ./', 'dim');
    log('  npm create elit-skills@latest ./my-app --target .claude/skills', 'dim');
    log('  npm create elit-skills@latest --list', 'dim');
}

function parseArgs(argv: string[]): { targetDir: string; targets: string[]; list: boolean; help: boolean } {
    const args = argv.slice(2);
    let targetDir = process.cwd();
    let targets: string[] = [...TARGET_DIRS];
    let list = false;
    let help = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--help' || arg === '-h') {
            help = true;
        } else if (arg === '--list') {
            list = true;
        } else if (arg === '--target') {
            const value = args[i + 1];
            if (!value || value.startsWith('--')) {
                log('Error: --target requires a value', 'red');
                process.exit(1);
            }
            targets = value.split(',').map((s) => s.trim()).filter(Boolean);
            i++;
        } else if (!arg.startsWith('--')) {
            targetDir = resolve(arg);
        }
    }

    return { targetDir, targets, list, help };
}

async function readSkills(): Promise<{ name: string; description: string }[]> {
    if (!existsSync(SKILLS_SRC)) {
        log(`Error: skills source not found at ${SKILLS_SRC}`, 'red');
        process.exit(1);
    }
    const entries = await readdir(SKILLS_SRC, { withFileTypes: true });
    const skills: { name: string; description: string }[] = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillFile = join(SKILLS_SRC, entry.name, 'SKILL.md');
        if (!existsSync(skillFile)) continue;
        const content = await readFile(skillFile, 'utf8');
        const match = content.match(/^description:\s*['"]?(.+?)['"]?\s*$/m);
        skills.push({ name: entry.name, description: match?.[1] ?? '' });
    }
    return skills;
}

async function copySkill(srcSkillDir: string, destSkillDir: string, skillName: string): Promise<void> {
    await mkdir(destSkillDir, { recursive: true });
    const srcFile = join(srcSkillDir, 'SKILL.md');
    const destFile = join(destSkillDir, 'SKILL.md');
    const content = await readFile(srcFile, 'utf8');
    await writeFile(destFile, content, 'utf8');
}

async function main(): Promise<void> {
    const { targetDir, targets, list, help } = parseArgs(process.argv);

    if (help) {
        printHelp();
        return;
    }

    const skills = await readSkills();

    if (list) {
        log('Available skills:', 'cyan');
        for (const s of skills) {
            log(`  ${s.name}`, 'green');
            log(`    ${s.description}`, 'dim');
        }
        return;
    }

    if (!existsSync(targetDir)) {
        log(`Error: target directory does not exist: ${targetDir}`, 'red');
        process.exit(1);
    }

    const targetStat = await stat(targetDir);
    if (!targetStat.isDirectory()) {
        log(`Error: target is not a directory: ${targetDir}`, 'red');
        process.exit(1);
    }

    const invalidTargets = targets.filter((t) => !TARGET_DIRS.includes(t));
    if (invalidTargets.length) {
        log(`Error: unknown --target value(s): ${invalidTargets.join(', ')}`, 'red');
        log(`Valid options: ${TARGET_DIRS.join(', ')}`, 'dim');
        process.exit(1);
    }

    log(`Scaffolding ${skills.length} Elit.js skill(s) into ${targetDir}`, 'cyan');
    log('');

    for (const target of targets) {
        const targetRoot = resolve(targetDir, target);
        log(`→ ${target}`, 'yellow');
        let created = 0;
        let skipped = 0;
        for (const skill of skills) {
            const srcSkillDir = join(SKILLS_SRC, skill.name);
            const destSkillDir = join(targetRoot, skill.name);
            const destFile = join(destSkillDir, 'SKILL.md');
            if (existsSync(destFile)) {
                log(`  • ${skill.name} (exists, skipped)`, 'dim');
                skipped++;
                continue;
            }
            await copySkill(srcSkillDir, destSkillDir, skill.name);
            log(`  • ${skill.name} (created)`, 'green');
            created++;
        }
        log(`  ${created} created, ${skipped} skipped`, 'dim');
        log('');
    }

    log('Done. Skills are ready for your AI coding tool.', 'green');
    log('');
    log('Next:', 'dim');
    log('  - Claude Code: skills under .claude/skills/ are auto-discovered', 'dim');
    log('  - Agents / Copilot: skills under .agents/skills/ or .github/skills/', 'dim');
    log('  - Edit any SKILL.md to fit your project — they are plain markdown with YAML frontmatter', 'dim');
}

main().catch((err: unknown) => {
    log(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`, 'red');
    process.exit(1);
});
