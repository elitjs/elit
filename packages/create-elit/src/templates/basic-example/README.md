# ELIT_PROJECT_NAME

A lightweight Elit starter with a polished single-page app, a reactive counter, and no API setup.

## What is included

- A small web app in `src/main.ts`
- CSS-in-JS styling in `src/styles.ts`
- Build, preview, mobile, desktop, and WAPK config in `elit.config.ts`
- Hidden scaffold files for `.gitignore`, `.wapkignore`, and `.wapkpatch`

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3003 to view your app.

## Project structure

- `src/main.ts` - main web entry with a reactive counter and starter layout
- `src/styles.ts` - app styling using `elit/style`
- `src/mobile.ts` - simple native preview entry for mobile mode
- `public/index.html` - browser entry document

## Useful scripts

- `npm run dev` - start the dev server with HMR
- `npm run build` - build the app for production
- `npm run preview` - preview the production build locally
- `npm run mobile:sync` - sync the web build into the mobile shell
- `npm run desktop:run` - run the desktop shell

## Learn more

- [Elit Documentation](https://elitjs.github.io/elit)
- [GitHub Repository](https://github.com/elitjs/elit)