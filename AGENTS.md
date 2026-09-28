# Flora

Static, mobile-first tracker for a 30-point plant week. No backend, no account. Data stays in `localStorage` on the device.

## Intent Layer

**Before modifying code in a subdirectory, read its AGENTS.md first** to understand local patterns and invariants.

There are no child nodes. The areas below are small enough to follow from this file.

- **Domain**: `src/domain` — weeks, search, scoring, log operations
- **Catalog**: `src/catalog` — bundled plants and aliases
- **Persistence**: `src/persistence` — `localStorage`, schema v1, migrations
- **UI**: `src/ui` — React shell; calls domain functions, does not score
- **Deploy**: `.github/workflows/pages.yml` — GitHub Pages from Actions

## Workflow

1. Put scoring, week, and storage rules in `src/domain` or `src/persistence`, with a test next to the change. Keep those modules free of React.
2. Add or retarget a plant in `src/catalog/foods.ts` (name, aliases, category). Do not special-case identity in the UI.
3. Wire behavior through `src/ui/useTracker.ts`. Components render state and call the pure log operations.
4. Check with `npm test` (Vitest, `TZ=Europe/Oslo`), `npm run typecheck`, and `npm run lint`.
5. Pushing `main` to [Hodnebo/flora](https://github.com/Hodnebo/flora) builds with `VITE_BASE=/flora/` and deploys to [hodnebo.github.io/flora](https://hodnebo.github.io/flora/). Pages source is GitHub Actions.

## Invariants

- One plant identity per ISO week (local Monday–Sunday). Full point is 1; nut, seed, herb, and spice are 0.25. Goal is 30.
- Scores are computed from the food’s current category. Do not store points on an entry.
- Catalog foods ship in the bundle. Only custom foods, entries, and theme go in `flora.state` (`schemaVersion: 1`).
- A newer `schemaVersion` is read-only: copy the raw payload to `flora.state.backup` and do not overwrite it.
- Chili and bell pepper are different plants. Paprika is chili. Peanut is a legume (1). Cultivars collapse (shallot → onion, broccolini → broccoli). Olive oil is not a food.
