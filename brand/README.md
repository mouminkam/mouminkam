# CAM_04 — the house standard

One look and one structure for every public repository under [github.com/mouminkam](https://github.com/mouminkam),
taken from the [portfolio](https://moumen-alkamsheh.vercel.app): a security-camera feed at night — black frames,
bone-white type, one cyan signal, detection boxes that lock on.

`generate.mjs` draws every banner, feed, panel and button as a self-contained SVG. Type is converted to outlines,
screenshots are embedded as JPEG, motion is plain CSS that stops under `prefers-reduced-motion`. Nothing loads at
view time, and the same inputs always produce byte-identical files.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `void` | `#000000` | Every frame |
| `bone` | `#e8e6e1` | Type |
| `ash` / `ash-dim` | `#8a9396` / `#717a7d` | Secondary labels, separators |
| `line-strong` | `#2a2f31` | Hairlines, frame brackets |
| `signal` | `#47c6ce` | The one accent: REC dot, detections, feed ids |
| `signal-deep` | `#0e3b42` | Haze |

| Role | Typeface | Setting |
| --- | --- | --- |
| Display | Hubot Sans Condensed ExtraBold | Uppercase, −0.01em |
| On-screen display | Martian Mono SemiCondensed | Uppercase, +0.08em |
| Text | Mona Sans Regular | Sentence case |

## What it draws

| File | Where it lives | What it is |
| --- | --- | --- |
| `header.svg` | `assets/` | The profile header: name, detection, thesis, rain |
| `feeds/<slug>.svg` | `assets/` | One monitor per project for the profile's wall |
| `chapter-*.svg`, `stack.svg`, `footer.svg`, `btn-*.svg` | `assets/` | Profile chrome |
| `feed.svg` | `<repo>/.github/assets/` | The repo's hero: its project, its own detections lit, the rest dimmed |
| `stack.svg`, `footer.svg`, `btn-*.svg` | `<repo>/.github/assets/` | The repo's stack strip, footer and buttons |

Projects, detection boxes, stacks and links live in [`data.mjs`](data.mjs), in step with the portfolio's
`src/content/projects.ts`.

## Repository anatomy

Every repository README has the same sections, in this order:

1. Feed (`feed.svg`), title, one-line pitch, buttons (live demo · case study · all work), stack strip
2. The product family table, when the product has more than one repository
3. **Overview** — what it is and how it runs
4. **Highlights** — what is in the box
5. **Architecture** — the folder tree and the data flow
6. **Getting started** and **Scripts**
7. **Engineering notes** — the one or two decisions worth reading
8. **Honest trade-offs**
9. Footer (`footer.svg`)

And the same conventions in the code:

- Source under `src/`, with `@/*` pointing at it. Mock data in `src/mocks`, behind the same seam a real API would use.
- npm scripts: `dev`, `build`, `start` or `preview`, `lint` (ESLint), `typecheck` (`tsc --noEmit`), `test` where there are tests.
- `.editorconfig` and a GitHub Actions workflow (`ci.yml`) that runs lint, typecheck, tests and the build on every push and pull request.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`).

## Regenerate

```bash
cd brand
npm install
npm run build          # ../assets
npm run build:repos    # also <dir>/<repo>/.github/assets, for repositories cloned next to this one
```

The fonts are not committed. Put these four files in `brand/fonts/` — all three families are under the
[SIL Open Font License](https://openfontlicense.org):

- `HubotSans-Condensed-ExtraBold.ttf` and `MonaSans-Regular.ttf` — [github/hubot-sans](https://github.com/github/hubot-sans), [github/mona-sans](https://github.com/github/mona-sans)
- `MartianMono-SemiCondensed-Regular.ttf` — [evilmartians/mono](https://github.com/evilmartians/mono)
