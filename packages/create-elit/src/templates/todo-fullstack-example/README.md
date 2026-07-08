# ELIT_PROJECT_NAME

A fullstack todo starter for Elit with file-backed persistence powered by `elit/database`.

## What is included

- A polished todo dashboard UI
- REST API routes in `src/server.ts`
- File persistence in `databases/todo.ts`
- Build, preview, mobile, desktop, and WAPK config already wired in `elit.config.ts`

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3003 and start adding tasks. Every create, update, complete, or delete action writes back to `databases/todo.ts`.

## Project structure

- `src/pages/TodoPage.ts` - main todo experience
- `src/server.ts` - CRUD API powered by `elit/database`
- `databases/todo.ts` - starter data file that acts as your local database
- `src/mobile.ts` - native preview entry for mobile mode

## Useful scripts

- `npm run dev` - start the dev server with HMR
- `npm run build` - build the web app for production
- `npm run preview` - preview the production build locally
- `npm run mobile:sync` - sync the web build into the mobile shell
- `npm run desktop:run` - run the desktop shell

## Learn more

- [Elit Documentation](https://elitjs.github.io/elit)
- [GitHub Repository](https://github.com/elitjs/elit)
