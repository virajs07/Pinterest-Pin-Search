# TODO

Working checklist. See [plan.md](plan.md) for the full task descriptions, acceptance criteria, and verification steps. See [../SPEC.md](../SPEC.md) for the *why*.

Flip a box only when:
1. acceptance criteria are met
2. tests for that task are green
3. the task's verification step has been performed
4. the change has been committed

---

## Phase A — Foundation

- [ ] **T01** Project setup (TypeScript, RTK, react-router, idb, vitest, RTL, fake-indexeddb, ESLint TS)
- [ ] **T02** Routing + empty pages — navigate `/` ↔ `/create`
- [ ] **T03** `Pin` types + `PinRepository` interface
- [ ] **T04** `IndexedDbPinRepository` with 3 stores (`pins`, `descriptions`, `blobs`) and cursor pagination
- [ ] **T05** Store skeleton + `hydrate` thunk + `RepositoryProvider`
- [ ] **T06** `toastsSlice` + `Toaster` UI

### 🟡 Checkpoint A
- [ ] `npm run typecheck && npm run lint && npm run test:run && npm run build` clean
- [ ] App boots, both routes navigate
- [ ] Hydration runs against empty IDB; Redux DevTools shape correct
- [ ] Manual toast dispatch displays + auto-dismisses

---

## Phase B — Single-pin pipeline

- [ ] **T07** Create-pin happy path (single variant; stacked list render)
- [ ] **T08** Optimistic create + rollback on IDB failure
- [ ] **T09** Image-set generation (170 / 236 / 474 / 736 / orig; WebP-with-JPEG-fallback)
- [ ] **T10** `<Pin>` component with `dominantColor` placeholder + `srcset` / `sizes`

### 🟡 Checkpoint B
- [ ] Create 5 pins of varied dimensions
- [ ] Pins persist across reload
- [ ] `<img>` carries `srcset` with 5 candidates
- [ ] DevTools → IndexedDB → `blobs` shows 5 entries per pin
- [ ] Forced repo failure → optimistic insert rolls back + error toast

---

## Phase C — Feed rendering

- [ ] **T11** Masonry layout with height balancing + absolute `transform`
- [ ] **T12** Paint scheduling (parallel load, in-order paint)
- [ ] **T13** Virtualization (window `[−1, +2]` viewports; cap 40 desktop / 20 mobile)

### 🟡 Checkpoint C
- [ ] Seed 200 pins via dev-only button
- [ ] Throttle network to Slow 3G; pins paint in feed order
- [ ] Forced 404 on one image: rest of feed still progresses
- [ ] Scroll deeply; DOM child count of `.masonry-container` stays ≤ 40 on desktop, ≤ 20 on mobile
- [ ] Resize across breakpoint repositions; resize within breakpoint does not

---

## Phase D — Search

- [ ] **T14** Infinite scroll (IntersectionObserver sentinel, cursor pagination)
- [ ] **T15** `SearchBar` + debounced suggestions (≥ 3 chars, 250 ms, AbortController + thunk `condition`)
- [ ] **T16** Query commit + filtered results + infinite scroll on filtered feed

### 🟡 Checkpoint D
- [ ] Seed 100 pins with varied descriptions
- [ ] Type < 3 chars → no request fires
- [ ] Type 3+ chars → suggestions after 250 ms
- [ ] Rapid typing cancels stale suggestion requests
- [ ] Click suggestion (or Enter) → filtered feed
- [ ] Filtered feed paginates correctly via infinite scroll
- [ ] Empty query restores unfiltered feed

---

## Phase E — Ship

- [ ] **T17** Accessibility pass (roles, alt, combobox aria, tab order, skip link, axe-core integration)
- [ ] **T18** Polish + README + final test/typecheck/build gates

### 🟢 Checkpoint E — Ready to ship
- [ ] All §10 coverage gates met:
  - `store/` ≥ 80%
  - `data/` ≥ 90% (raised — it's the swap-point)
  - `masonry/` ≥ 80%
  - `lib/` ≥ 80%
- [ ] Manual smoke (Checkpoints C + D) re-run end-to-end
- [ ] `npm run build` produces a clean production bundle
- [ ] README explains how to run, test, build
- [ ] All `[UNVERIFIED]` flags in SPEC (DR-10, DR-15) either re-measured or re-affirmed

---

## Out of scope (per SPEC §1 non-goals)

- ~~Real backend / auth~~
- ~~PWA / service worker / offline~~
- ~~SSR~~
- ~~Stale-tab auto-refresh~~
- ~~Hover previews / boards / pin-detail page~~
- ~~e2e tests (Playwright / Cypress)~~

If any of these need to come in scope, reopen the SPEC and add tasks here.
