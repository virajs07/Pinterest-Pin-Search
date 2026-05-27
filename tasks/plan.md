# Implementation Plan

Source of truth for *what* to build is [SPEC.md](../SPEC.md). This document is *how* and *in what order*.

**Working principle: vertical slicing.** Each task delivers a single thin path from the user's perspective (or, where there's no user UI yet, from an integration test's perspective). We never build "the whole data layer" or "the whole UI layer" as a horizontal milestone — that pattern hides integration risk until the end.

---

## 1. Dependency graph

Block edges represent hard dependencies. Tasks at the same depth can be parallelized if you split the work.

```
              ┌──────────────────────────────┐
              │  T01 Project setup (TS + deps)│
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T02 Routing + empty pages   │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T03 Pin type + PinRepository│
              │      interface               │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T04 IndexedDbPinRepository  │
              │      (3 stores + indexes)    │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T05 Store skeleton + hydrate│
              │      (RTK, RepositoryProvider)│
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T06 Toast slice + Toaster   │
              └───────────────┬──────────────┘
                              │
            ───────────  Checkpoint A  ───────────
                              │
              ┌───────────────▼──────────────┐
              │  T07 Create-pin happy path   │
              │      (single variant, simple │
              │       list render)           │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T08 Optimistic create +     │
              │      rollback                │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T09 Image-set generation    │
              │      (5 sizes, WebP/JPEG)    │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T10 Pin component           │
              │      (placeholder + srcset)  │
              └───────────────┬──────────────┘
                              │
            ───────────  Checkpoint B  ───────────
                              │
              ┌───────────────▼──────────────┐
              │  T11 Masonry layout          │
              │      (height balancing)      │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T12 Paint scheduling        │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T13 Virtualization          │
              └───────────────┬──────────────┘
                              │
            ───────────  Checkpoint C  ───────────
                              │
              ┌───────────────▼──────────────┐
              │  T14 Infinite scroll         │
              │      (IntersectionObserver,  │
              │       cursor pagination)     │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T15 SearchBar + debounced   │
              │      suggestions             │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T16 Query commit + filtered │
              │      results                 │
              └───────────────┬──────────────┘
                              │
            ───────────  Checkpoint D  ───────────
                              │
              ┌───────────────▼──────────────┐
              │  T17 Accessibility pass      │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │  T18 Polish + docs           │
              └───────────────┬──────────────┘
                              │
            ───────────  Checkpoint E  ───────────
```

**Why this order:**

- **Repository before store** (T04 → T05): the store hydrates from the repo on boot, so the repo must exist and be tested first.
- **Toast slice before optimistic create** (T06 → T08): rollback needs to surface a toast; building rollback without the toast would leave failure invisible.
- **Single-variant create before image-set generation** (T07 → T09): proves the data path end-to-end; expanding to 5 variants is a pure extension.
- **Pin component before Masonry** (T10 → T11): Masonry positions Pins; Pin must exist as a self-contained unit first.
- **Masonry before paint scheduling & virtualization** (T11 → T12, T13): both extensions read positioned-pin geometry from the layout hook.
- **Infinite scroll before search** (T14 → T15): the search feed is the same feed with a `query` filter — building infinite scroll on the unfiltered feed first means search adds *one* parameter, not a new pipeline.

---

## 2. Phases & checkpoints

A **checkpoint** is a hard stop where we run the full test suite, take screenshots/recordings of the user-visible state, and decide whether to continue or refactor. Skipping checkpoints is how a vertical-slice plan degenerates into a horizontal one.

| Checkpoint | Gate criteria | Demo |
|---|---|---|
| **A — Foundation** (after T06) | App boots; routes navigate; store hydrates empty state from IDB; toasts can be dispatched manually | Click between `/` and `/create`; trigger a debug toast |
| **B — Single-pin pipeline** (after T10) | Can create a pin with image upload; pin persists across reload; pin renders with srcset; rollback works under forced IDB failure | Create 3 pins, refresh, see them; flip a kill switch on repo → see rollback toast |
| **C — Feed rendering** (after T13) | Feed renders in masonry; paint is in order under throttled network; DOM child count stays within cap when scrolling deep with ~200 seeded pins | Throttle network to "Slow 3G" and scroll a seeded feed |
| **D — Search** (after T16) | Suggestions appear ≥3 chars / 250 ms; clicking suggestion commits; filtered results paginate via infinite scroll | Type "cat", pick a suggestion, scroll filtered results |
| **E — Ship** (after T18) | All §10 testing-strategy goals met (≥80% coverage on store/data/masonry/lib); manual smoke checklist green; README current | Run `npm run test:run`, `npm run typecheck`, `npm run build` clean |

---

## 3. Tasks

Each task carries: **Goal**, **Vertical scope** (what user-visible or testable thing is added), **Spec refs**, **Files**, **Tests**, **Acceptance**, **Verification**, **Risks**.

### T01 — Project setup (TypeScript + dependencies)
- **Goal.** Convert the JS scaffold to TypeScript and install runtime + dev dependencies.
- **Vertical scope.** Project compiles, dev server boots, empty test suite runs. No new features.
- **Spec refs.** DR-3, DR-20, DR-21, DR-22, DR-23, DR-25.
- **Files (new/modified).**
  - `package.json` — add `@reduxjs/toolkit`, `react-redux`, `react-router-dom`, `idb`, `uuid`; dev: `typescript`, `@types/react`, `@types/react-dom`, `@types/uuid`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `fake-indexeddb`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`.
  - `tsconfig.json` — strict mode, `moduleResolution: bundler`, path alias `@/*` → `src/*`.
  - `vite.config.ts` — replace `.js`, add path alias.
  - `vitest.config.ts` (or merge into `vite.config.ts`) — jsdom env, setup file for `@testing-library/jest-dom`.
  - `src/main.tsx`, `src/App.tsx` — rename from `.jsx`, add explicit types.
  - `eslint.config.js` — add `@typescript-eslint`.
  - `index.html` — point to `main.tsx`.
- **Tests.** None added — but `npm test` exits 0 with "no tests".
- **Acceptance.**
  - `npm install` clean.
  - `npm run dev` serves the existing default React page.
  - `npm run typecheck` passes.
  - `npm run lint` passes.
- **Verification.** Open dev server; observe default page; run all three npm scripts.
- **Risks.** ESLint v10 plus the TS plugin can have peer-dep conflicts on older Node — pin Node ≥ 20 if needed.

### T02 — Routing + empty pages
- **Goal.** Two routes (`/`, `/create`) with placeholder pages and a header navigation link.
- **Vertical scope.** User can navigate between the two pages.
- **Spec refs.** DR-22, §13.2.
- **Files.**
  - `src/App.tsx` — `<BrowserRouter>` + `<Routes>`.
  - `src/features/search/SearchPage.tsx` — placeholder "Search".
  - `src/features/create/CreatePinPage.tsx` — placeholder "Create".
  - `src/ui/AppHeader.tsx` + module CSS — logo / nav links.
- **Tests.** Component test: clicking the "Create" link navigates to `/create`.
- **Acceptance.** Manual navigation works in both directions; refresh on `/create` stays on that route.
- **Verification.** `npm run dev`; click around.
- **Risks.** None.

### T03 — Pin types + `PinRepository` interface
- **Goal.** Define the contract every consumer codes against.
- **Vertical scope.** No user-visible change; downstream tasks now have stable types.
- **Spec refs.** DR-1, §7.1, §7.3.
- **Files.**
  - `src/types/Pin.ts` — `Pin`, `NewPin`, `ImageVariant`.
  - `src/data/PinRepository.ts` — interface, `RepositoryError` (typed errors).
- **Tests.** Type-only — a `.test-d.ts` file with `expectAssignable` checks (or just rely on `npm run typecheck`).
- **Acceptance.** `npm run typecheck` passes; types match §7 verbatim.
- **Verification.** Inspect file; typecheck.
- **Risks.** Naming the variant-size keys as string literals (`'170' | '236' | ...`) is intentional — change only with cross-team approval.

### T04 — IndexedDbPinRepository
- **Goal.** Implement the repo against IDB with three stores (`pins`, `descriptions`, `blobs`) and indexes from §7.2.
- **Vertical scope.** A working persistence layer testable in isolation with `fake-indexeddb`.
- **Spec refs.** DR-1, DR-4, DR-5, DR-21.
- **Files.**
  - `src/data/db.ts` — `openDB` with schema migration (`upgrade` callback).
  - `src/data/IndexedDbPinRepository.ts` — implements `PinRepository`.
  - `src/data/index.ts` — barrel.
  - `src/test/setup.ts` — installs `fake-indexeddb/auto`.
- **Tests.** `IndexedDbPinRepository.test.ts`:
  - create round-trips via `getById`
  - `list({ limit })` returns by `createdAt` desc
  - `list({ cursor, limit })` paginates stably across inserts
  - `list({ query })` filters by `descriptionLower` prefix
  - `suggest('cat', 8)` returns matching description strings
- **Acceptance.** All repo tests green; coverage on `data/` ≥ 90%.
- **Verification.** `npm run test:run -- data`.
- **Risks.** Cursor stability under inserts depends on `createdAt|id` composite — encode `nextCursor` as `${createdAt}:${id}`.

### T05 — Store skeleton + hydrate thunk + `RepositoryProvider`
- **Goal.** Wire RTK store with `pinsSlice` + `feedSlice.hydrate`, served via React context.
- **Vertical scope.** App boots, hydration pulls 60 pins from IDB (empty on first load), Redux DevTools shows correct shape.
- **Spec refs.** DR-1, DR-2, §7.4, §13.5.
- **Files.**
  - `src/store/index.ts` — `configureStore` + typed `useAppDispatch`/`useAppSelector`.
  - `src/store/pinsSlice.ts` — `createEntityAdapter`.
  - `src/store/feedSlice.ts` — `hydrate` thunk only.
  - `src/data/RepositoryProvider.tsx` — context provider + `useRepository` hook.
  - `src/main.tsx` — wrap App in `<Provider store>` + `<RepositoryProvider>`.
- **Tests.**
  - `feedSlice.test.ts`: hydrate sets pins + descIndex from a fake repo.
  - `RepositoryProvider.test.tsx`: `useRepository()` returns the injected instance.
- **Acceptance.** Boot shows empty state; Redux DevTools reveals `pins: { ids: [], entities: {} }`.
- **Verification.** `npm run dev` + Redux DevTools.
- **Risks.** Avoid eager `URL.createObjectURL` on hydration for pins not yet visible — materialize variant URLs lazily in selectors (cache on first read).

### T06 — Toast slice + Toaster UI
- **Goal.** Global toast queue, top-right placement, 4 s auto-dismiss.
- **Vertical scope.** Any future failure path has a place to surface.
- **Spec refs.** §3.7, DR-17.
- **Files.**
  - `src/store/toastsSlice.ts` — `push`, `dismiss`, with auto-dismiss via thunk + setTimeout.
  - `src/ui/Toaster.tsx`, `src/ui/Toast.tsx`, module CSS.
- **Tests.** Slice unit; component: pushing a toast renders it and removes after 4 s (advance fake timers).
- **Acceptance.** Manual: dispatch a debug toast from a hidden dev button — toast appears and dismisses.
- **Verification.** Add a temporary dev-only button in `SearchPage` to dispatch `toasts/push({type:'error', message:'test'})`; remove the button before commit.
- **Risks.** Real timers vs Vitest fake timers — be explicit.

### 🟡 Checkpoint A
Run: `npm run typecheck && npm run lint && npm run test:run && npm run build`. Open `/` and `/create`; confirm hydration logs an empty pin list. Trigger a manual toast. Take a screenshot of each page.

---

### T07 — Create-pin happy path (single variant, simple list render)
- **Goal.** User can upload an image and a description; the pin is persisted and shown in a plain vertical list on `/`.
- **Vertical scope.** End-to-end create + read works. Masonry, paint scheduling, etc., come later.
- **Spec refs.** §3.1, DR-17 (without rollback yet).
- **Files.**
  - `src/features/create/CreatePinPage.tsx` — page shell.
  - `src/features/create/PinForm.tsx` — file input + textarea + submit.
  - `src/features/create/useImageMetadata.ts` — extract `width`/`height`/`dominantColor`; emit a single `orig` variant Blob.
  - `src/lib/dominantColor.ts` — canvas-based average over 32×32 downsample.
  - `src/lib/uuid.ts` — `crypto.randomUUID()` wrapper.
  - `src/store/feedSlice.ts` — `createPin` thunk (no rollback in this task).
  - `src/features/search/Feed.tsx` — minimal stacked-list render (use `<ul>` for now).
- **Tests.**
  - `dominantColor.test.ts` — known pixel grid → expected hex.
  - `useImageMetadata.test.tsx` — fixture File → expected metadata.
  - `feedSlice.createPin.test.ts` — happy path inserts + persists.
- **Acceptance.** Create 3 pins; refresh; see them in feed.
- **Verification.** Manual in dev server.
- **Risks.** `crypto.randomUUID()` requires a secure context — Vite dev (localhost) is fine.

### T08 — Optimistic create + rollback
- **Goal.** `createPin` inserts into store **before** awaiting the repo; on reject, removes and toasts.
- **Vertical scope.** UI feels instant; failures are surfaced.
- **Spec refs.** DR-17, §13.6, §13.10.
- **Files.**
  - `src/store/feedSlice.ts` — `createPin` thunk gains optimistic dispatch + rollback on `rejected`.
  - `src/store/pinsSlice.ts` — `removeOne` action exposed.
- **Tests.**
  - Thunk integration: `repo.create` rejects → pin is removed from `pins.entities` and `feed.order`, and a toast is pushed.
  - The optimistic record is visible in store state synchronously after dispatch.
- **Acceptance.** Inject a `FailingRepository` wrapper via context in a manual test page → optimistic insert flashes, then rolls back with a toast.
- **Verification.** Temporary "fail next create" toggle (dev-only) in the create page; flip it on, submit, observe behavior.
- **Risks.** Make sure rollback only removes the optimistic id, not a previously-confirmed pin with the same description.

### T09 — Image-set generation (5 sizes, WebP-with-fallback)
- **Goal.** Each created pin yields five `Blob` variants stored in IDB, with MIME negotiated per browser.
- **Vertical scope.** Created pins carry the responsive shape consumed later by `<img srcset>`.
- **Spec refs.** §3.1, DR-13.
- **Files.**
  - `src/lib/webpSupport.ts` — `detectWebpSupport()` one-time async, cached.
  - `src/features/create/useImageMetadata.ts` — extend to generate `170 / 236 / 474 / 736 / orig`.
  - `src/data/IndexedDbPinRepository.ts` — write Blobs to `blobs` store keyed `${pinId}:${size}`.
- **Tests.**
  - `useImageMetadata.test.tsx` (extended): asserts 5 Blobs returned, each with the right declared width.
  - Repo test: round-trip Pin reads back all 5 variants with materialized `URL.createObjectURL`.
- **Acceptance.** Inspect DevTools → Application → IndexedDB → `blobs` shows 5 entries per pin.
- **Verification.** Manual + tests.
- **Risks.** Resize loop on the main thread will jank for very large images — accept for now; §11 tracks the worker upgrade.

### T10 — Pin component (placeholder + srcset)
- **Goal.** Reusable `<Pin>` that shows the `dominantColor` placeholder until `paintReady`, then mounts `<img srcset sizes alt>`.
- **Vertical scope.** Visual quality of an unloaded pin; correct responsive image loading.
- **Spec refs.** §3.6, DR-12, DR-13.
- **Files.**
  - `src/masonry/Pin.tsx` — props `{ pin, paintReady, columnWidth }`.
  - `src/masonry/Pin.module.css` — fixed aspect-ratio box (`aspect-ratio: width / height`).
  - `src/features/search/Feed.tsx` — pass `paintReady = true` for now (no scheduler yet).
- **Tests.**
  - `Pin.test.tsx`:
    - When `paintReady` false, `<img>` is absent; placeholder has correct `background-color`.
    - When `paintReady` true, `<img>` is present with expected `srcset` candidate count and `sizes`.
- **Acceptance.** Pins show dominantColor while loading, then snap to the image.
- **Verification.** Throttle network to "Slow 3G" in DevTools; observe.
- **Risks.** Aspect-ratio CSS in older browsers — we target modern only, so fine.

### 🟡 Checkpoint B
Run full test suite. Create 5 pins of varied dimensions. Confirm:
- pins persist across reload
- `<img>` shows `srcset` with 5 candidates
- DevTools shows 5 blobs per pin in IDB
- Triggered failure causes rollback + toast

---

### T11 — Masonry layout (height balancing, absolute transform)
- **Goal.** Replace the stacked list with the masonry container; pins place via height-balancing into the right number of columns per breakpoint.
- **Vertical scope.** Feed visually becomes Pinterest-shaped.
- **Spec refs.** DR-6, DR-7, DR-8, DR-9, §13.9.
- **Files.**
  - `src/masonry/columns.ts` — `getColumnCount(width)` per breakpoints (640/1024/1440/1920).
  - `src/masonry/useMasonryLayout.ts` — input: array of pin ids + column-width → output: positions `[ {x, y, height, columnIndex} ]` and container height. Caches `columnHeights[]`. Exposes `appendPins(ids)`.
  - `src/masonry/Masonry.tsx` — `position: relative` container; children rendered with `transform: translate(...)`.
  - `src/features/search/Feed.tsx` — replace `<ul>` with `<Masonry>`.
  - Resize handler — `useEffect` + `ResizeObserver` on container; debounced 150 ms; only recompute if column count changed.
- **Tests.**
  - `useMasonryLayout.test.ts` — fixture of 7 pins with varied aspect ratios in 3 columns → expected `(columnIndex, y)` per pin.
  - `useMasonryLayout.test.ts` — appending a second batch reuses `columnHeights`, no movement on existing pins.
  - `columns.test.ts` — breakpoint boundaries.
- **Acceptance.**
  - Visually: feed is a balanced 5-column wall on desktop, 2 on mobile.
  - Resize across a breakpoint repositions; resize within a breakpoint does not (verify with a `transform` snapshot).
- **Verification.** Manual + tests.
- **Risks.** Sub-pixel rendering with `translate` — snap to integer pixels in the layout computation.

### T12 — Paint scheduling (parallel load, ordered paint)
- **Goal.** `<Pin>` mounts its `<img>` only after all earlier pins in the feed have resolved (loaded or errored).
- **Vertical scope.** On slow networks, pins paint top-to-bottom in feed order.
- **Spec refs.** DR-11, §13.8, §13.11.
- **Files.**
  - `src/masonry/usePaintScheduler.ts` — accepts the ordered list of pin ids; preloads via `new Image()`; tracks per-pin state; exposes `isPaintReady(pinId)`.
  - `src/masonry/Masonry.tsx` — feed paintReady into each `<Pin>`.
- **Tests.**
  - `usePaintScheduler.test.ts` — mock `Image` constructor; assert pin N's `paintReady` flips true only after pins 0..N-1 are non-pending.
  - Errored pin (single retry then advance) does not block downstream.
- **Acceptance.** On Slow 3G, pins paint in order; force one image to 404 and confirm the rest still progress.
- **Verification.** Manual under throttle; DevTools network panel.
- **Risks.** Image cache poisoning across tests — clear cache between tests.

### T13 — Virtualization (window + device cap)
- **Goal.** Cap rendered pins to `[−1, +2]` viewports around scroll position, hard-bounded by device class (40 desktop / 20 mobile-tablet).
- **Vertical scope.** Deep scroll stays smooth; DOM size is bounded.
- **Spec refs.** DR-10, §3.5.
- **Files.**
  - `src/masonry/useVirtualWindow.ts` — given pin positions + scrollTop + viewport height + cap → returns visible pin ids.
  - `src/masonry/Masonry.tsx` — only render the visible subset.
- **Tests.** `useVirtualWindow.test.ts` — fixture positions + scroll positions → expected visible-id sets; cap honored.
- **Acceptance.** Seed 200 pins via a dev-only "seed" button; scroll deeply; DevTools shows DOM child count ≤ 40 on desktop.
- **Verification.** DevTools Elements panel — count children of `.masonry-container`.
- **Risks.** Container height must remain `max(columnHeights)` regardless of which children are rendered, so scrollbar geometry stays correct.

### 🟡 Checkpoint C
Throttle network to Slow 3G; seed 200 pins; scroll deep. Confirm:
- in-order paint
- DOM cap holds
- 5-column desktop layout; resize to mobile shows 2 columns
- no visible jump on column-count change

---

### T14 — Infinite scroll (IntersectionObserver + cursor pagination)
- **Goal.** Scrolling to near the end of the feed fetches the next 20 pins.
- **Vertical scope.** Feed is no longer fixed-size on hydrate; scroll loads more.
- **Spec refs.** §3.2, DR-5, DR-16, §13.8.
- **Files.**
  - `src/store/feedSlice.ts` — `fetchPage(cursor)` thunk; `state.feed.status` lifecycle; `nextCursor` tracking; `end` status when repo returns no `nextCursor`.
  - `src/features/search/InfiniteLoader.tsx` — sentinel element with `IntersectionObserver`.
  - `src/features/search/Feed.tsx` — wire sentinel + thunk dispatch.
  - `src/data/IndexedDbPinRepository.ts` — cursor decoded as `${createdAt}:${id}`; cursor-stable IDB cursor reads.
- **Tests.**
  - `feedSlice.fetchPage.test.ts` — happy path, end-of-feed, cancellation when query changes.
  - `InfiniteLoader.test.tsx` — sentinel intersect → dispatches.
- **Acceptance.** Seed 100 pins; on initial load show 20; scroll → next 20 load; bottom shows "end of feed".
- **Verification.** Manual.
- **Risks.** Race when `fetchPage` is dispatched twice in quick succession — use `condition` on the thunk to skip if `status === 'loading'`.

### T15 — SearchBar + debounced suggestions
- **Goal.** Typing in the search bar shows suggestions after a 250 ms debounce, ≥ 3 characters, cancelling stale requests.
- **Vertical scope.** User can browse the description index by typing.
- **Spec refs.** §3.2, DR-14, DR-15, §13.7.
- **Files.**
  - `src/store/suggestionsSlice.ts` — `suggest(query)` thunk; `condition` to skip on `< 3` chars; uses AbortController.
  - `src/lib/debounce.ts` — small debounce util.
  - `src/features/search/useDebouncedSuggestions.ts` — input value → dispatches debounced suggest.
  - `src/features/search/SearchBar.tsx` — combobox shell (`role="combobox"`, `aria-expanded`, `aria-activedescendant`).
  - `src/features/search/SuggestionsList.tsx` — `role="listbox"`; up to 8 items.
  - `src/store/index.ts` — register `descIndex` (already added in T05 for hydration; just expose a selector).
- **Tests.**
  - `debounce.test.ts` — timing.
  - `useDebouncedSuggestions.test.tsx` — < 3 chars → no dispatch; 3 chars → dispatch after 250 ms; rapid typing cancels prior.
  - `suggestionsSlice.test.ts` — `condition` blocks stale; AbortController aborts in-flight.
  - `SearchBar.test.tsx` — keyboard navigation through suggestions (arrow keys, Enter).
- **Acceptance.** Type "c", "ca" → silence; type "cat" → after 250 ms, suggestions appear; rapidly type "catz" before "cat" returns → only one network call lands.
- **Verification.** Manual with throttled network + tests.
- **Risks.** Mocking AbortController in tests — use `fake-indexeddb`'s async resolution or wrap the repo with an explicit promise.

### T16 — Query commit + filtered results
- **Goal.** Picking a suggestion (or pressing Enter) commits a query; the feed shows only matching pins; infinite scroll continues to work for the filtered feed.
- **Vertical scope.** Real Pinterest-style search loop closed.
- **Spec refs.** §3.2, §13.7.
- **Files.**
  - `src/store/feedSlice.ts` — `setQuery(query)` clears `feed.order` and triggers `fetchPage`; thunk passes `query` to `repo.list`.
  - `src/features/search/SearchBar.tsx` — emit commit on Enter or click.
  - `src/features/search/Feed.tsx` — show "no results" empty state when `status === 'end'` and feed is empty.
- **Tests.**
  - `feedSlice.setQuery.test.ts` — changing query clears feed, dispatches `fetchPage`, cancels stale `fetchPage`.
  - `Feed.test.tsx` — empty-results path.
- **Acceptance.** Type "cat", pick "cat photos", feed updates to filtered; clear query → unfiltered feed restored.
- **Verification.** Manual.
- **Risks.** Switching queries mid-load must cancel — use the `fetchPage` thunk's AbortController; also clear `nextCursor`.

### 🟡 Checkpoint D
Full smoke test: create pins with varied descriptions; search for prefix and substring matches; verify suggestion debounce, query commit, filtered pagination, paint order, and DOM cap. Take a screen recording at this point.

---

### T17 — Accessibility pass
- **Goal.** Make the app usable with keyboard and screen reader.
- **Vertical scope.** No new features; behavior tightened.
- **Spec refs.** §3.8, DR-6 (tab order rationale).
- **Files.**
  - `src/masonry/Masonry.tsx` — `role="list"` on container.
  - `src/masonry/Pin.tsx` — `role="listitem"`; tabindex for keyboard focus.
  - `src/features/search/SearchBar.tsx` — combobox aria already in T15; verify `aria-controls` and `aria-activedescendant` flow.
  - Skip-link to feed for keyboard users.
  - Honor `prefers-reduced-motion` (we have no motion yet, but document the rule).
- **Tests.** RTL + `axe-core/react` integration to catch obvious a11y violations.
- **Acceptance.**
  - Tab from the search bar → focused suggestions → committed query → first pin → next pin (in feed order, not column-first).
  - Screen reader (VoiceOver / NVDA) announces feed as a list, items as list items with their alt text.
- **Verification.** Manual with VoiceOver on macOS.
- **Risks.** Focus management when pins virtualize in/out — keep focus by id, not by DOM index.

### T18 — Polish + docs
- **Goal.** README, contributing notes, and final touches.
- **Vertical scope.** Project ready to hand off.
- **Spec refs.** §11 (open questions), §12 (boundaries).
- **Files.**
  - `README.md` — overview, scripts, link to SPEC.
  - `tasks/todo.md` — confirm all checkboxes flipped.
  - Optional: `scripts/seed.ts` — generate N synthetic pins for performance testing (kept out of production bundle).
  - Optional: `docs/diagrams/` + `npm run diagrams` script if we adopt the static-SVG diagrams flow.
- **Tests.** Final `npm run test:run` + `npm run typecheck` + `npm run build` clean.
- **Acceptance.** All §10 testing-strategy targets met; README explains how to run, test, build.
- **Verification.** Fresh clone → `npm install && npm test && npm run build` succeeds.

### 🟢 Checkpoint E — Ready to ship
All §10 coverage targets met. Manual smoke checklist (from Checkpoint C and D, repeated) green. Demo video recorded if desired.

---

## 4. Risks & mitigations

| Risk | Mitigation | First task that exposes it |
|---|---|---|
| Main-thread image resize jank | Accept for MVP; §11 tracks OffscreenCanvas worker upgrade | T09 |
| Cursor stability under concurrent inserts | Encode cursor as `createdAt:id`; test cursor pagination explicitly | T04 |
| Paint scheduler stalls on a hung image load | Single retry then advance (DR-11); enforce with an absolute timeout (5 s) | T12 |
| Stale suggestion responses overwriting newer ones | Both AbortController *and* RTK thunk `condition` (DR-15) | T15 |
| DOM cap breached on rapid scroll | Test with seeded 200-pin fixture; assert cap in component test | T13 |
| Forgetting to revoke object URLs → memory leak | Repository owns variant URL lifecycle; revoke on pin eviction from store | T05 |
| TypeScript strict-mode friction with idb's generic types | Use `idb`'s `DBSchema` to give the database a typed schema | T04 |

## 5. What I'm explicitly *not* doing

These are flagged as non-goals in SPEC §1 and stay out unless someone says otherwise:

- Real backend / network layer / auth
- PWA, service worker, offline-first
- SSR
- Stale-tab auto-refresh
- Hover previews, boards, pin detail
- e2e tests (Playwright/Cypress) — deferred per DR-18
- A design-token system / dark mode

## 6. Coverage gates per phase

| Phase | Target | Reasoning |
|---|---|---|
| End of A (T06) | 100% on `store/toastsSlice`, `store/feedSlice.hydrate` | Foundation must be rock-solid |
| End of B (T10) | ≥ 90% on `data/`, ≥ 80% on `lib/` | The persistence layer is the contract — should not regress |
| End of C (T13) | ≥ 80% on `masonry/` | The hardest logic; bugs are visible to users |
| End of D (T16) | ≥ 80% on `store/`, ≥ 70% on `features/` | UI is tested by behavior; coverage is a side effect |
| End of E (T18) | All targets from SPEC §10 | Final ship gate |
