#!/usr/bin/env node

import { mkdir, writeFile, readFile, readdir } from 'fs/promises';
import { join, resolve, dirname, basename } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const hiddenTemplateFiles: Record<string, string> = {
  gitignore: '.gitignore',
  wapkignore: '.wapkignore',
  wapkpatch: '.wapkpatch'
};

const sharedAppAiProfileTemplateId = '_shared-ai-profile';

interface TemplateDefinition {
  id: string;
  aliases: string[];
  description: string;
  isDefault?: boolean;
}

const templates: TemplateDefinition[] = [
  {
    id: 'todo-fullstack-example',
    aliases: ['todo', 'todo-fullstack-example'],
    description: 'Function-store-backed todo workspace starter'
  },
  {
    id: 'basic-example',
    aliases: ['basic', 'basic-example'],
    description: 'Lightweight single-page starter',
    isDefault: true
  },
  {
    id: 'auth-fullstack-example',
    aliases: ['auth', 'auth-fullstack-example'],
    description: 'Authentication and chat starter'
  }
];

const defaultTemplate = templates.find((template) => template.isDefault)?.id ?? templates[0].id;

const templateAliases = Object.fromEntries(
  templates.flatMap((template) => template.aliases.map((alias) => [alias, template.id]))
) as Record<string, string>;

// Get the version from create-elit's package.json
async function getElitVersion(): Promise<string> {
  const packageJsonPath = resolve(__dirname, '../package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
  return packageJson.version;
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logAvailableTemplates() {
  log('Available templates:', 'yellow');

  for (const template of templates) {
    const primaryAlias = template.aliases[0];
    const defaultSuffix = template.id === defaultTemplate ? ' (default)' : '';
    const fullName = template.aliases[1] ? ` [${template.aliases[1]}]` : '';

    log(`  ${primaryAlias}${defaultSuffix} - ${template.description}${fullName}`, 'dim');
  }
}

function logHelp() {
  log('Usage:', 'yellow');
  log('  create-elit [project-name] [options]', 'dim');
  log('', 'reset');
  log('Options:', 'yellow');
  log('  -t, --template <name>   Choose a template', 'dim');
  log('  -l, --list-templates    Show available templates', 'dim');
  log('  -h, --help              Show this help message', 'dim');
  log('', 'reset');
  logAvailableTemplates();
}

function resolveTemplateName(templateName: string): string {
  const normalized = templateAliases[templateName];

  if (!normalized) {
    log(`Error: Unknown template "${templateName}".`, 'red');
    logAvailableTemplates();
    process.exit(1);
  }

  return normalized;
}

function getCliOptions(): {
  projectName: string;
  templateName: string;
  listTemplates: boolean;
  showHelp: boolean;
} {
  const args = process.argv.slice(2);
  let projectName = 'my-elit-app';
  let templateName = defaultTemplate;
  let listTemplates = false;
  let showHelp = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--list-templates' || arg === '--list' || arg === '-l') {
      listTemplates = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      showHelp = true;
      continue;
    }

    if (arg === '--template' || arg === '-t') {
      const nextArg = args[index + 1];

      if (!nextArg || nextArg.startsWith('-')) {
        log('Error: Missing value for --template.', 'red');
        logAvailableTemplates();
        process.exit(1);
      }

      templateName = resolveTemplateName(nextArg);
      index += 1;
      continue;
    }

    if (arg.startsWith('--template=')) {
      templateName = resolveTemplateName(arg.slice('--template='.length));
      continue;
    }

    if (arg.startsWith('-t=')) {
      templateName = resolveTemplateName(arg.slice('-t='.length));
      continue;
    }

    if (!arg.startsWith('-') && projectName === 'my-elit-app') {
      projectName = arg;
    }
  }

  return {
    projectName,
    templateName,
    listTemplates,
    showHelp
  };
}

// Recursively copy directory
async function copyDirectory(
  src: string,
  dest: string,
  replacements: Record<string, string>
): Promise<void> {
  await mkdir(dest, { recursive: true });

  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, replacements);
    } else {
      await copyAndReplaceFile(srcPath, destPath, replacements);
    }
  }
}

// Copy file and replace placeholders
async function copyAndReplaceFile(
  src: string,
  dest: string,
  replacements: Record<string, string>
): Promise<void> {
  let content = await readFile(src, 'utf-8');

  // Replace all placeholders
  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.split(placeholder).join(value);
  }

  const hiddenFileName = hiddenTemplateFiles[basename(dest)];
  const finalDest = hiddenFileName
    ? join(dirname(dest), hiddenFileName)
    : dest;

  await writeFile(finalDest, content, 'utf-8');
}

async function copySharedAppAiProfile(
  projectPath: string,
  replacements: Record<string, string>
): Promise<void> {
  const profilePath = resolve(__dirname, 'templates', sharedAppAiProfileTemplateId);

  if (!existsSync(profilePath)) {
    return;
  }

  await copyDirectory(profilePath, projectPath, replacements);

  const githubSkillsPath = join(profilePath, '.github', 'skills');

  if (!existsSync(githubSkillsPath)) {
    return;
  }

  await copyDirectory(githubSkillsPath, join(projectPath, '.claude', 'skills'), replacements);
  await copyDirectory(githubSkillsPath, join(projectPath, '.agents', 'skills'), replacements);
}

async function createProject(projectName: string, templateName: string) {
  const projectPath = resolve(process.cwd(), projectName);
  const templatesPath = resolve(__dirname, 'templates', templateName);

  // Check if directory exists
  if (existsSync(projectPath)) {
    log(`Error: Directory "${projectName}" already exists!`, 'red');
    process.exit(1);
  }

  if (!existsSync(templatesPath)) {
    log(`Error: Template "${templateName}" is not available in this build.`, 'red');
    logAvailableTemplates();
    process.exit(1);
  }

  log(`Creating a new Elit app in ${projectPath}...`, 'cyan');
  log(`Using template: ${templateName}`, 'dim');

  // Get the version of elit (same as create-elit version)
  const elitVersion = await getElitVersion();

  // Define replacements
  const replacements: Record<string, string> = {
    'ELIT_PROJECT_NAME': projectName,
    'ELIT_VERSION': elitVersion
  };

  // Copy the selected template directory and replace placeholders
  await copyDirectory(templatesPath, projectPath, replacements);
  await copySharedAppAiProfile(projectPath, replacements);

  log('\nSuccess! Created ' + projectName, 'green');
  log('\nInside that directory, you can run several commands:', 'dim');
  log('\n  npm run dev', 'cyan');
  log('    Starts the development server with HMR\n', 'dim');
  log('  npm run build', 'cyan');
  log('    Builds the app for production\n', 'dim');
  log('  npm run preview', 'cyan');
  log('    Preview the production build\n', 'dim');
  log('\nWe suggest that you begin by typing:\n', 'dim');
  log(`  cd ${projectName}`, 'cyan');
  log('  npm install', 'cyan');
  log('  npm run dev\n', 'cyan');
  log('Happy coding! 🚀', 'green');
}

// Main execution
const { projectName, templateName, listTemplates, showHelp } = getCliOptions();

log('\n🚀 Create Elit App\n', 'cyan');

if (showHelp) {
  logHelp();
  process.exit(0);
}

if (listTemplates) {
  logAvailableTemplates();
  process.exit(0);
}

createProject(projectName, templateName).catch((err) => {
  log(`Error: ${err.message}`, 'red');
  process.exit(1);
});
