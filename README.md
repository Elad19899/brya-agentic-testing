# Brya Agentic Testing — Automation Framework

A production-grade automation framework for **[brya.com](https://www.brya.com/)** — Brya's in-person social wellness platform for adults 50+.
Built with **Playwright + TypeScript**, the **Page Object Model**, **Allure reporting**, and **GitHub Actions CI**.

---

## 1. Project Overview

Brya is a social wellness platform that helps adults 50+ stay socially active through AI-powered event matching, member-led activities, vetted service providers, and community connections. The marketing site at `brya.com` is the top of the funnel — broken navigation, dead links, or a misconfigured robots.txt directly hurt acquisition.

This framework covers the public-facing site at two layers:

| Layer | What it verifies | Why it matters |
|-------|------------------|----------------|
| **UI** | Homepage, navigation, footer, About, Partners, responsive layout, accessibility | Catches user-visible regressions before customers see them |
| **API** | Health, security headers, SEO endpoints, static-asset integrity, HTTP semantics | Catches infra and CDN regressions invisible to UI tests |

### Critical business flows mapped

1. **Marketing-site discoverability** — page loads, meta tags, sitemap, robots
2. **Navigation integrity** — header, footer, internal routes, mobile menu
3. **Conversion CTAs** — primary "Get Started" / app-store badges
4. **Cross-device experience** — phone, tablet, desktop breakpoints
5. **B2B funnel** — Partners page contact form
6. **Security posture** — HSTS, X-Frame, CSP, X-Content-Type-Options, no banner leaks
7. **Performance budget** — homepage TTFB < 3s

---

## 2. Architecture

```
brya-agentic-testing/
├── .github/workflows/
│   └── ci.yml                       # CI/CD — UI ⫽ API jobs + Allure
├── config/
│   └── env.config.ts                # Single source of truth for env vars
├── src/
│   ├── pages/                       # Page Object Model layer
│   │   ├── BasePage.ts              #   Abstract base (shared helpers)
│   │   ├── HomePage.ts              #   /
│   │   ├── AboutPage.ts             #   /about
│   │   ├── PartnersPage.ts          #   /partners + contact form
│   │   └── components/              #   Cross-page UI components
│   │       ├── NavigationComponent.ts
│   │       └── FooterComponent.ts
│   ├── api/
│   │   └── ApiClient.ts             # Wrapper over Playwright APIRequestContext
│   ├── fixtures/
│   │   └── test-fixtures.ts         # Custom fixtures (POM + API injection)
│   └── utils/
│       ├── logger.ts                # Structured logging
│       └── test-data.ts             # Deterministic test-data factories
├── tests/
│   ├── ui/                          # Browser-driven specs
│   │   ├── home.spec.ts
│   │   ├── navigation.spec.ts
│   │   ├── footer.spec.ts
│   │   ├── about.spec.ts
│   │   ├── partners.spec.ts
│   │   ├── responsive.spec.ts
│   │   └── accessibility.spec.ts
│   └── api/                         # APIRequestContext specs
│       ├── health.spec.ts
│       ├── security-headers.spec.ts
│       ├── seo.spec.ts
│       ├── static-assets.spec.ts
│       └── http-methods.spec.ts
├── playwright.config.ts             # Projects: ui-{chromium,firefox,webkit,mobile}, api
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Architectural principles

- **POM with composition** — Pages extend `BasePage`. Cross-page UI (header, footer) is modeled as **components** injected into pages and tests, not duplicated.
- **Fixtures, not constructors** — Tests destructure POMs from fixtures (`async ({ homePage }) => …`), keeping every spec free of `new HomePage(page)` boilerplate.
- **Projects = test layers** — Playwright "projects" map 1:1 to CI jobs. UI and API are separate projects so they can run in parallel and be filtered independently.
- **Config in one place** — `config/env.config.ts` is the single source of truth for runtime knobs. Add a new variable there and to `.env.example`; nowhere else.
- **Tags drive scope** — `@smoke`, `@regression`, `@seo` tags let CI run different subsets without renaming files.

---

## 3. Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| **Node.js** | ≥ 18 LTS (20 recommended) | Playwright runtime |
| **npm** | ≥ 9 | Package manager |
| **Java** | ≥ 11 | Allure CLI generates reports on the JVM |
| **Git** | any recent | Source control |

Optional:
- **Allure CLI** globally (`npm i -g allure-commandline`) — speeds up `allure open` invocations. The local `allure-commandline` devDep already covers everything if you prefer not to install globally.

---

## 4. Installation

```bash
# 1. Clone
git clone <your-fork-url> brya-agentic-testing
cd brya-agentic-testing

# 2. Install dependencies
npm install

# 3. Install Playwright browsers (chromium + firefox + webkit)
npm run playwright:install

# 4. Copy env template
cp .env.example .env
# Edit .env with any overrides you need; defaults already target https://www.brya.com
```

---

## 5. Configuration

All runtime behavior is controlled by environment variables loaded via `dotenv` in `config/env.config.ts`. Override locally in `.env` (gitignored) or via the shell.

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `https://www.brya.com` | Site under test |
| `API_BASE_URL` | `https://www.brya.com` | API host (same as UI for public site) |
| `DEFAULT_TIMEOUT` | `30000` | Per-action / expect timeout in ms |
| `NAVIGATION_TIMEOUT` | `45000` | `page.goto` timeout in ms |
| `RETRIES` | `0` locally / `2` in CI | Test retries |
| `WORKERS` | Playwright default | Parallel worker count |
| `HEADED` | `false` | Run browsers visibly |
| `TEST_ENV` | `production` | Tag for Allure environment info |
| `SUBMIT_PARTNER_FORM` | unset | Set to `true` to actually submit the Partners form (off by default; do **not** enable on prod) |

---

## 6. Running tests

### All tests (UI + API)

```bash
npm test
```

### UI tests

```bash
# Every browser
npm run test:ui

# Single browser
npm run test:ui:chromium
npm run test:ui:firefox
npm run test:ui:webkit
npm run test:ui:mobile     # iPhone 13 viewport
```

### API tests

```bash
npm run test:api
```

### By tag

Tags live in spec titles (`@smoke`, `@regression`, `@seo`):

```bash
npm run test:smoke         # only @smoke
npm run test:regression    # only @regression

# Or directly:
npx playwright test --grep @seo
npx playwright test --grep-invert @regression
```

### A specific file or test name

```bash
# Single spec
npx playwright test tests/ui/home.spec.ts

# Test title contains "tagline"
npx playwright test -g "tagline"

# Only the Partners spec on chromium
npx playwright test tests/ui/partners.spec.ts --project=ui-chromium
```

### Interactive / debug modes

```bash
npm run test:headed        # see the browser
npm run test:debug         # Playwright Inspector
npx playwright test --ui   # Playwright UI mode (best DX)
npx playwright codegen https://www.brya.com   # selector recorder
```

---

## 7. Reporting (Allure)

Three reporters run by default: `list` (terminal), `html` (Playwright built-in), and `allure-playwright` (rich dashboard).

### Generate & open the Allure report locally

```bash
# Run tests (produces ./allure-results)
npm test

# Generate static HTML and open in your browser
npm run report

# Or step-by-step
npm run report:generate    # builds ./allure-report
npm run report:open        # serves it

# Clean previous artifacts
npm run report:clean
```

### Playwright's built-in HTML report

```bash
npx playwright show-report
```

### In CI

Every CI run uploads:
- `allure-results-ui-<project>` and `allure-results-api` — raw JSON
- `allure-report` — merged static site
- `playwright-report-<project>` — Playwright HTML report
- `traces-<project>` — failure-only traces, videos, screenshots

On `main`/`master`, the merged Allure report is published to GitHub Pages (`gh-pages` branch).

---

## 8. CI/CD

`/.github/workflows/ci.yml` defines four jobs:

```
install ──→ ui-tests (matrix: chromium, firefox, webkit, mobile)
       ╲─→ api-tests
                ╲──→ allure-report (merge + publish)
```

- **UI and API run in parallel**, on separate jobs, with separate artifact uploads.
- The UI job runs a **matrix across all browsers** so a Safari-only regression surfaces immediately.
- The API job installs only Chromium to keep cold-start time minimal.
- The `allure-report` job runs `if: always()` so we still publish a report when tests fail — the failure context is what we most need.
- The pipeline triggers on **push, PR, daily 03:00 UTC schedule, and manual dispatch** (with an optional `--grep` filter input).

### Triggering a custom CI run

GitHub → Actions → **Brya CI** → **Run workflow** → enter a filter like `@smoke` to scope.

---

## 9. Writing new tests

### Add a new UI page

1. Create `src/pages/MyPage.ts` extending `BasePage`.
2. Register it as a fixture in `src/fixtures/test-fixtures.ts`.
3. Add specs under `tests/ui/my-page.spec.ts`.

```ts
import { test, expect } from '../../src/fixtures/test-fixtures';

test('@smoke my page loads', async ({ myPage }) => {
  await myPage.goto();
  await myPage.expectLoaded();
});
```

### Add a new API endpoint

1. Add a method to `src/api/ApiClient.ts` if a custom verb/header preset is needed.
2. Add a spec under `tests/api/<area>.spec.ts`.

```ts
test('@regression /api/foo returns JSON', async ({ apiClient }) => {
  const res = await apiClient.get('/api/foo');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/json');
});
```

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Error: browserType.launch: Executable doesn't exist` | Browsers not installed | `npm run playwright:install` |
| Allure says "no results" | Wrong folder or stale results | `npm run report:clean && npm test && npm run report` |
| Timeouts on every test | Site or network slow | Bump `DEFAULT_TIMEOUT` / `NAVIGATION_TIMEOUT` in `.env` |
| `test.skip` everywhere | Page returning 404 / different than test expected | Update selectors in the corresponding POM file |
| Allure CLI: `Cannot find Java` | JDK missing | Install JDK 11+ |

---


