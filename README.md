# Typewright

A self-study knowledge base for **TypeScript** and **Playwright**: clear explanations, real examples, self-explaining quizzes and hands-on tasks with the result you should end up with. Content is based on the official TypeScript and Playwright documentation (every lesson lists its sources).

Design: Mintlify-inspired (monochrome + one mint green, Inter, 4px controls / 16px cards), with GitBook-style paper surfaces and Geist Mono for code.

## Run

```bash
npm install
npm run dev        # http://localhost:5199
npm run build      # type-check + production build into dist/
```

## Deploy

Pushing to `main` builds the site and publishes it to GitHub Pages via `.github/workflows/deploy.yml`.

## Features

- 23 lessons across two tracks (TypeScript 7.0, Playwright 1.65)
- Quizzes with an explanation for every answer; tasks with hints and an expected result
- **Bottlenecks** wiki: every `> [!PITFALL]` callout collected in one page
- ⌘K / `/` search across lessons and sections
- Progress (lessons, tasks, quiz answers) saved in your browser's localStorage

## Adding or editing lessons

Lessons are plain markdown files in `src/content/typescript/` and `src/content/playwright/`. The `NN-` prefix sets the order and the rest of the file name is the URL slug. The full format (frontmatter, `=== quiz`, `=== task`, `=== sources`, callouts, `:::steps`, `variant="bad|good"` code blocks) is documented at the top of `src/content/loader.ts`.
