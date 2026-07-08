# create-elit

Scaffolding tool for creating new Elit projects.

## Usage

Default starter:

```bash
npm create elit@latest my-app
```

Pick a template:

```bash
npm create elit@latest my-app -- --template basic
```

List available templates:

```bash
npm create elit@latest -- --list-templates
```

With other package managers:

```bash
yarn create elit my-app --template todo
pnpm create elit my-app --template todo
bun create elit my-app --template todo
deno run -A npm:create-elit my-app --template todo
```

## Templates

- `basic` - lightweight single-page starter with a reactive counter and no API setup
- `todo` (default) - fullstack todo workspace with persistence in `databases/todo.ts` via `elit/database`
- `auth` - auth and chat starter with profile and messaging flows

You can also use the full folder names:

- `basic-example`
- `todo-fullstack-example`
- `auth-fullstack-example`

CLI flags:

- `-t`, `--template <name>` - choose a template
- `-l`, `--list-templates` - show available templates
- `-h`, `--help` - show usage and template options

## What Each Project Includes

- TypeScript setup
- `package.json` with Elit scripts
- `elit.config.ts` for dev, build, preview, mobile, desktop, and WAPK flows
- Auto-generated hidden files such as `.gitignore`, `.wapkignore`, and `.wapkpatch`
- Shared AI guidance files such as `AGENTS.md` and Elit app skills for `.github/skills`, `.claude/skills`, and `.agents/skills`
- Template-specific AI instructions for the selected starter under `.github/instructions`
- A ready-to-run README tailored to the selected starter

## Example

```bash
npm create elit@latest my-elit-app -- --template basic
cd my-elit-app
npm install
npm run dev
```

Visit http://localhost:3003 to see your app.

## Learn More

- [Elit Documentation](https://d-osc.github.io/elit)
- [GitHub Repository](https://github.com/elitjs/elit)
- [npm Package](https://www.npmjs.com/package/elit)

## License

MIT
