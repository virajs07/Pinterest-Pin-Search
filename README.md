# Pin Search & Create

A Pinterest-style single-page web app. Users create pins (image + description) and browse them in a responsive masonry feed with type-ahead search and infinite scroll. The backend is **IndexedDB** in the browser — hidden behind a repository interface so it can be swapped for an HTTP API later without touching the UI.

> No server. No accounts. Everything is local to your browser.

---

## Table of contents

- [Highlights](#highlights)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Configuration knobs](#configuration-knobs)
- [Testing](#testing)
- [Browser support](#browser-support)
- [Limitations & non-goals](#limitations--non-goals)
- [Troubleshooting](#troubleshooting)
- [Further reading](#further-reading)

---

## Highlights

- **Two pages**: a Search feed at `/` and a Create form at `/create`.
- **Masonry layout** with absolute-positioned, height-balanced placement (Pinterest's approach) — pins maintain reading order top-to-bottom across columns.
- **Responsive columns** from 2 (mobile) up to 6 (wide desktop), with layout recomputed only when the column count crosses a breakpoint.
- **Optimistic create** — the new pin appears in the feed instantly; if the IndexedDB write fails, the pin is rolled back and an error toast is shown.
- **Type-ahead search** — debounced 250 ms after 3 characters, with stale responses dropped via `AbortController` + Redux Toolkit thunk `condition`.
- **Infinite scroll** via `IntersectionObserver` and cursor-based pagination (20 results per page).
- **DOM virtualization** — at most 40 pins on desktop / 20 on mobile rendered at once, regardless of how deep the user has scrolled.
- **Paint scheduling** — images load in parallel but mount in feed order; on slow networks pins paint top-to-bottom instead of popcorn-style.
- **Responsive images** — each pin generates five WebP (or JPEG fallback) variants at upload time; `<img srcset>` lets the browser pick the right one.
- **Dominant-color placeholders** — while an image loads, its slot is filled with the dominant color of the image so the layout doesn't shift.
- **Accessible** — combobox ARIA on the search bar, list/listitem roles on the feed, descriptive `alt` text, a skip link, and a focusable `<main>` landmark.
- **Toast notifications** — global, top-right, auto-dismiss after 4 s.

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | React 19 + Vite 8 |
| Language | TypeScript (strict mode) |
| State | Redux Toolkit + React-Redux |
| Routing | `react-router-dom` v7 |
| Persistence | IndexedDB via [`idb`](https://github.com/jakearchibald/idb) |
| Styling | CSS Modules (no runtime CSS-in-JS) |
| Testing | Vitest + React Testing Library + `fake-indexeddb` |
| Lint | ESLint (flat config) + `typescript-eslint` + `react-hooks` |

A full justification for each pick (and what was rejected) is in [SPEC.md](./SPEC.md) — 25 Decision Records.

---

## Getting started

### Prerequisites

- **Node.js 20.x or newer** (for the latest ESLint + Vite + TS).
- **npm 10+** (other package managers work but lockfile is npm).

Verify:

```bash
node --version   # v20+
npm --version    # 10+
```

### Install

```bash
git clone <this-repo>
cd pin-search-create
npm install
```

### Run the dev server

```bash
npm run dev
```

Vite starts on http://localhost:5173. Open the URL, click **Create** in the header, upload any image, type a description, and submit. The pin appears immediately in the feed. Refresh the tab — it persists in IndexedDB.

### Production build

```bash
npm run build       # type-checks, then bundles to dist/
npm run preview     # serves the dist/ build locally on http://localhost:4173
```

---

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR. |
| `npm run build` | `tsc --noEmit` then `vite build` → `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm test` | Vitest in watch mode. |
| `npm run test:run` | Vitest single run (used in CI). |
| `npm run test:coverage` | Vitest with V8 coverage report (HTML in `coverage/`). |
| `npm run typecheck` | `tsc --noEmit` — no emit, just check. |
| `npm run lint` | ESLint on `.ts/.tsx`. |

---

## Project structure

```
src/
├── App.tsx                      # router shell
├── AppRoutes.tsx                # <Routes> + header + toaster
├── main.tsx                     # bootstraps store, repo, hydrate
├── data/
│   ├── PinRepository.ts         # the swap-point interface
│   ├── IndexedDbPinRepository.ts# IDB implementation
│   ├── db.ts                    # schema + openDB
│   ├── RepositoryProvider.tsx   # React context provider
│   └── index.ts                 # barrel
├── store/
│   ├── index.ts                 # configureStore + typed hooks
│   ├── pinsSlice.ts             # createEntityAdapter
│   ├── feedSlice.ts             # hydrate, fetchPage, createPin, setQuery
│   ├── suggestionsSlice.ts      # debounced suggest thunk
│   └── toastsSlice.ts           # global notifications
├── features/
│   ├── search/
│   │   ├── SearchPage.tsx       # combines SearchBar + Feed
│   │   ├── SearchBar.tsx        # combobox + keyboard nav
│   │   ├── SuggestionsList.tsx  # listbox
│   │   ├── useDebouncedSuggestions.ts
│   │   ├── Feed.tsx             # orchestrates Masonry + InfiniteLoader
│   │   └── InfiniteLoader.tsx   # IntersectionObserver sentinel
│   └── create/
│       ├── CreatePinPage.tsx
│       ├── PinForm.tsx
│       └── useImageMetadata.ts  # dimensions + dominant color + variants
├── masonry/
│   ├── Masonry.tsx              # absolute-positioned container
│   ├── Pin.tsx                  # placeholder + srcset
│   ├── useMasonryLayout.ts      # height-balancing
│   ├── useVirtualWindow.ts      # render window + cap
│   ├── usePaintScheduler.ts     # parallel-load, ordered-paint
│   └── columns.ts               # breakpoints
├── ui/
│   ├── AppHeader.tsx
│   ├── Toaster.tsx
│   └── Toast.tsx
├── lib/
│   ├── dominantColor.ts         # average over a 32×32 downsample
│   ├── imageSizing.ts           # variant size math (no upscale)
│   ├── webpSupport.ts           # one-time feature detect
│   └── debounce.ts
├── types/
│   └── Pin.ts                   # Pin + NewPin + variants
├── test/
│   └── setup.ts                 # jest-dom + fake-indexeddb
└── vite-env.d.ts                # CSS module + Vite ambient types
```

The choice of **feature-first with role folders** (over Atomic Design or type-based folders) is recorded in [SPEC DR-24](./SPEC.md).

---

## How it works

### Two-page flow

1. **Search page** (`/`)
   - On boot, the app calls `repo.list({ limit: 60 })` to seed the feed.
   - Typing 3+ characters in the search bar dispatches a debounced `suggest` after 250 ms.
   - Picking a suggestion (or pressing Enter) commits the query: the feed clears and the next 20 results are fetched.
   - As you scroll, an `IntersectionObserver` sentinel ~2 viewports above the bottom triggers the next page.
   - Only pins within `[-1, +2]` viewports of the current scroll are rendered, hard-capped at 40 (desktop) or 20 (mobile/tablet).

2. **Create page** (`/create`)
   - Pick an image file. The client:
     - decodes it via `Image()` to get intrinsic dimensions,
     - extracts a dominant color (average over a 32×32 canvas downsample),
     - generates five responsive variants (170 / 236 / 474 / 736 / orig) as **WebP** Blobs (or JPEG if the browser doesn't support WebP).
   - On submit, an **optimistic** Redux update inserts the pin into the feed instantly while the IDB write happens in the background.
   - On IDB failure, the optimistic insert is rolled back and an error toast is shown.

### The swap-point

UI and Redux code never import `idb` directly. They go through `PinRepository`:

```ts
interface PinRepository {
  list(opts: ListOpts, signal?: AbortSignal): Promise<ListResult>;
  suggest(prefix: string, limit: number, signal?: AbortSignal): Promise<string[]>;
  create(pin: NewPin, signal?: AbortSignal): Promise<Pin>;
  getById(id: string, signal?: AbortSignal): Promise<Pin | undefined>;
  revoke?(pinId: string): void;
}
```

To replace IndexedDB with an HTTP API later, write `HttpPinRepository implements PinRepository` and pass it to `makeStore()` and `<RepositoryProvider>` in `main.tsx`. Nothing else changes.

### Persistence

Three IndexedDB object stores:

| Store | Key | Indexes |
|---|---|---|
| `pins` | `id` | `byCreatedAt`, `byCreatedAtId` (composite), `byDescriptionLower` |
| `descriptions` | `descriptionLower` | — (value: `{ description, pinIds[] }`) |
| `blobs` | `${pinId}:${size}` | — (image bytes) |

Metadata is kept separate from blob bytes so suggestion lookups don't pull image bytes off disk. Cursor pagination is keyset (`createdAt + id`), so paginating is O(log N) and stable under inserts.

---

## Configuration knobs

These constants are reasonable defaults; tweak them in code if you need to.

| Constant | File | Default |
|---|---|---|
| Page size (results per fetch) | `src/store/feedSlice.ts` (`PAGE_SIZE`) | `20` |
| Suggestion min characters | `src/store/suggestionsSlice.ts` (`SUGGESTION_MIN_CHARS`) | `3` |
| Suggestion debounce | `src/store/suggestionsSlice.ts` (`SUGGESTION_DEBOUNCE_MS`) | `250` ms |
| Suggestion max items | `src/store/suggestionsSlice.ts` (`SUGGESTION_LIMIT`) | `8` |
| Toast auto-dismiss | `src/ui/Toast.tsx` (`TOAST_TIMEOUT_MS`) | `4000` ms |
| Column breakpoints (px → columns) | `src/masonry/columns.ts` (`getColumnCount`) | `< 640 → 1` · `< 1024 → 2` · `≥ 1024 → 3` |
| App content max-width | CSS variable `--app-content-max` in `src/index.css` | `1280 px` |
| App horizontal padding | CSS variable `--app-content-pad` in `src/index.css` | `24 px` |
| Masonry gap | `src/masonry/columns.ts` (`MASONRY_GAP_PX`) | `12` px |
| DOM cap (desktop / mobile) | `src/masonry/useVirtualWindow.ts` (`getDomCap`) | `40 / 20` |
| Resize debounce | `src/masonry/Masonry.tsx` (`RESIZE_DEBOUNCE_MS`) | `150` ms |

---

## Testing

```bash
npm test              # watch mode
npm run test:run      # one-shot (CI)
npm run test:coverage # HTML report in coverage/
```

**88 tests** covering:

- **Pure logic** — masonry height-balancing, paint-ready computation, virtualization windowing, dominant-color extraction, image sizing math, debounce timing.
- **Repository** — round-trips, cursor pagination stability across inserts, query-prefix filtering, suggestion prefix scan (using `fake-indexeddb`).
- **Redux slices** — hydration, optimistic create with rollback, stale-response drop on rapid query churn, debounced suggest with abort.
- **Components** — Pin placeholder vs `<img>` mount, SearchBar threshold/debounce/keyboard nav, Feed empty state, AppRoutes navigation, Toaster lifecycle.

Manual smoke tests not covered by the suite (canvas-dependent):

- Visual verification of in-order paint under Slow 3G throttling.
- DOM child count staying within cap during deep scroll.
- Full Create → IndexedDB → refresh → Search round-trip with a real image.

---

## Browser support

- **Chrome / Edge / Firefox / Safari**: latest two majors.
- Requires native **IndexedDB**, **Canvas 2D**, **IntersectionObserver**, and **CSS `aspect-ratio`** support — all available since Safari 15 / Chrome 88 / Firefox 89.
- **WebP encoding** is feature-detected at boot. Browsers without WebP encode support (older Safari < 14) fall back to JPEG automatically.

---

## Limitations & non-goals

The current build is intentionally scoped — see [SPEC §1 non-goals](./SPEC.md) for the full list:

- **No backend / auth / multi-user.** All data is local to one browser tab.
- **No service worker / offline-first PWA.**
- **No SSR.** This is a single-page client app.
- **No stale-tab refresh.** Long-running sessions don't auto-purge cached pins.
- **No hover previews, boards, or pin-detail page.**

Known **[UNVERIFIED]** items (per [SPEC §11](./SPEC.md)):

- Virtualization cap (40 desktop / 20 mobile) is taken from Pinterest's published behavior; we haven't profiled our own implementation.
- Suggestion debounce (250 ms) is convention; we have no usage data to tune it.
- Image-set generation runs on the main thread. Very large uploads (>10 MP) may jank for a few hundred ms during canvas resize; tracked for a future `OffscreenCanvas` worker upgrade.

---

## Troubleshooting

**The feed is empty after I refresh.**
Open DevTools → Application → IndexedDB → `pin-search-create`. If the database is missing, you're in a new origin (e.g. `localhost:5173` vs `127.0.0.1:5173`); IDB is origin-scoped.

**My image upload fails silently.**
Check the file is one the browser can decode. Non-image files are rejected by the `accept="image/*"` filter; corrupted images fail with an error message under the file input.

**Browser DevTools shows a lot of `blob:` URLs.**
The repository materializes one `URL.createObjectURL` per `(pin, size)` for visible pins. They're cached and reused across feed pages. A `revoke(pinId)` API exists for future delete-pin paths but isn't currently invoked because nothing deletes pins.

**`npm install` complains about peer dependencies.**
You're likely on Node < 20. Upgrade — ESLint 10 and Vite 8 both require Node 20.

**Tests fail with "Hook timed out" on `beforeEach`.**
You're running an older `fake-indexeddb` version. Run `npm install` to update.

---

## Further reading

- [**SPEC.md**](./SPEC.md) — the design document. 25 Decision Records (Problem / Options / Pros & Cons / Decision), 11 Mermaid diagrams, references to MDN, web.dev, and the underlying Pinterest brief.
- [**tasks/plan.md**](./tasks/plan.md) — the task-by-task implementation plan with checkpoints between phases.
- [**tasks/todo.md**](./tasks/todo.md) — the actual checklist that was worked through; useful as a status snapshot.

---

## License

Unlicensed. Internal demo project.
