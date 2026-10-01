# Flora

Flora helps you count how many different plant foods you eat in a week. The goal is **30 points per ISO week** (Monday through Sunday on your local calendar).

Each unique plant food counts as **1 point**. Nuts, seeds, herbs, and spices count as **0.25**. You can log the same plant only once per week. Fresh, dried, and prepared forms of the same plant count once, as do colour or cultivar variants (shallot with onion, broccolini with broccoli, all bell-pepper colours together). Chili is separate from bell pepper. Peanut is a legume (1 point). Paprika counts as chili.

Grains and a few other plants (coffee, tea, cocoa, mushrooms, seaweed) are included so the familiar “30 plants” week still works. Olive oil is not its own food.

**Custom foods:** choose a category; the score follows that category. Custom foods are remembered on this device.

**Single device.** No account and no cloud sync.

### Local development

Requires Node 22+.

```bash
npm install
npm run dev
```

### Tests

`npm test` runs Vitest with `TZ=Europe/Oslo`, so the week-boundary tests see a local Monday that is still Sunday in UTC. Domain and persistence tests are the main focus.

Also useful: `npm run typecheck`, `npm run lint`, and `npm run format:check`.

### Build and GitHub Pages

```bash
npm run build
```

Pushing to `main` runs the GitHub Actions workflow that builds `dist` and deploys it to GitHub Pages.

`VITE_BASE` defaults to `/{repository}/`, which matches a **project** site such as `https://hodnebo.github.io/flora/`. For a user or organization site (`https://<user>.github.io/`) or a custom domain served from the site root, set `VITE_BASE=/` when you build (locally or in CI).

In the repository, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**, not “Deploy from a branch”.

The production build is a **PWA**: web app manifest plus a service worker for offline caching.

### Persistence

All app data lives in `localStorage` under the key `flora.state`. The JSON includes `schemaVersion: 1`. Catalog foods ship with the app and are **not** copied into `localStorage`. Only custom foods, log entries, theme, display language, and ledger grouping are stored. A save without `settings.language` still opens, and the language stays English. A save without `settings.grouping` opens grouped by day.

A small storage adapter (`createStore`) wraps `getItem` / `setItem` so persistence can be swapped later. `migrate()` upgrades missing or older payloads to v1, drops invalid entries, and deduplicates the same food within a week. If `schemaVersion` is newer than this app understands, the app refuses to load and copies the raw payload to `flora.state.backup` instead of overwriting it.

Scores are not stored. They are computed from each food’s current category, so changing a custom food’s category recalculates every week that includes it. Week membership comes from the entry’s `weekKey` (ISO week of the local calendar date), not the UTC day of the timestamp.

### Product decisions

- Live scores from current categories; no per-entry score snapshots.
- Weeks follow the local ISO calendar (Monday start).
- Cultivar and colour variants collapse to one plant per week.
- Chili and bell pepper are separate plants; paprika follows chili.
- Peanut scores as a legume (1), not a nut (0.25).
- Grains and “other” plants (coffee, tea, cocoa, mushrooms, seaweed) count toward the 30.
- Olive oil does not count as its own plant.
- The weekly ledger is alphabetical within two groups (full points vs quarter points).
