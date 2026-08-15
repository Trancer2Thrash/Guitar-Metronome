# Guitar Practice Metronome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a mobile-first guitar practice metronome with precise Web Audio scheduling, editable rhythm accents, tempo/quiet-count trainers, local presets, and the selected “String Pulse” interface.

**Architecture:** React owns configuration and presentation state, while pure TypeScript modules own rhythm math, trainers, validation, and persistence. A framework-independent audio engine schedules pre-generated click buffers against `AudioContext.currentTime`; the UI reads scheduled beat snapshots for visual synchronization. The application is a static Vite build deployed to GitHub Pages.

**Tech Stack:** React, TypeScript, Vite, Web Audio API, Zod, Vitest, Testing Library, Playwright, ESLint, pnpm, GitHub Actions/Pages.

---

## File map

```text
.github/workflows/ci.yml                 pull-request and push verification
.github/workflows/deploy.yml             GitHub Pages deployment
src/audio/AudioEngine.ts                 browser Web Audio adapter and click buffers
src/audio/BeatScheduler.ts               look-ahead scheduling lifecycle
src/audio/audioTypes.ts                  scheduler/audio contracts
src/audio/scheduler.worker.ts            low-cost scheduler wake-up loop
src/domain/metronome.ts                  public settings and runtime types
src/rhythm/beatSequence.ts               meter/subdivision event generation
src/rhythm/meter.ts                      defaults and accent normalization
src/rhythm/tapTempo.ts                   tap interval filtering
src/training/tempoTrainer.ts             pure tempo-program state machine
src/training/quietCount.ts               pure audible/silent bar state machine
src/storage/presetSchema.ts              Zod import/storage schemas
src/storage/presetStore.ts               localStorage repository
src/hooks/useMetronome.ts                React/audio orchestration
src/hooks/useWakeLock.ts                 optional Screen Wake Lock lifecycle
src/components/StringPulse.tsx           selected beat visualization
src/components/TempoControls.tsx         BPM, slider, tap and step controls
src/components/QuickSettings.tsx         meter/subdivision/training summary
src/components/SettingsSheet.tsx         mobile sheet / desktop side panel
src/components/AccentEditor.tsx          per-beat strong/medium/weak/mute editor
src/components/TrainerPanel.tsx          tempo and quiet-count forms
src/components/PresetPanel.tsx           save/load/import/export UI
src/components/FocusMode.tsx             stage-style fullscreen view
src/components/TransportButton.tsx       primary play/pause action
src/styles/tokens.css                    color/type/spacing tokens
src/styles/app.css                       responsive String Pulse layout
src/test/setup.ts                        test environment setup
src/**/*.test.ts(x)                      unit/component tests
playwright/metronome.spec.ts             end-to-end smoke and persistence tests
```

## Task 1: Bootstrap the tested Vite application

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `index.html`, `vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `eslint.config.js`, `src/main.tsx`, `src/App.tsx`
- Create: `src/test/setup.ts`, `src/App.test.tsx`

- [ ] **Step 1: Create package metadata and install dependencies**

Use scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "pnpm lint && pnpm test && pnpm build"
  }
}
```

Run:

```powershell
pnpm add react react-dom zod
pnpm add -D typescript vite @vitejs/plugin-react vitest jsdom eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh @types/react @types/react-dom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
```

- [ ] **Step 2: Write the failing shell test**

```tsx
it('renders the selected String Pulse product shell', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /六弦节拍器/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /开始节拍/i })).toBeInTheDocument()
})
```

- [ ] **Step 3: Run the test and verify the shell is absent**

Run: `pnpm test -- src/App.test.tsx`
Expected: FAIL because the heading and transport do not exist.

- [ ] **Step 4: Add the minimal accessible shell**

```tsx
export default function App() {
  return (
    <main>
      <h1>六弦节拍器</h1>
      <button type="button">开始节拍</button>
    </main>
  )
}
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm test -- src/App.test.tsx && pnpm build`
Expected: all commands exit 0.

```powershell
git add package.json pnpm-lock.yaml index.html vite.config.ts tsconfig*.json eslint.config.js src
git commit -m "chore: bootstrap metronome web app"
```

## Task 2: Define meters, accents, subdivisions, and beat events

**Files:**
- Create: `src/domain/metronome.ts`
- Create: `src/rhythm/meter.ts`, `src/rhythm/meter.test.ts`
- Create: `src/rhythm/beatSequence.ts`, `src/rhythm/beatSequence.test.ts`

- [ ] **Step 1: Write failing meter tests**

```ts
expect(defaultAccents({ numerator: 4, denominator: 4 })).toEqual([
  'strong', 'weak', 'medium', 'weak',
])
expect(normalizeAccents(['strong'], 3)).toEqual(['strong', 'weak', 'weak'])
```

- [ ] **Step 2: Run tests and verify missing implementations**

Run: `pnpm test -- src/rhythm/meter.test.ts`
Expected: FAIL with unresolved exports.

- [ ] **Step 3: Define stable domain types and meter helpers**

```ts
export type BeatAccent = 'strong' | 'medium' | 'weak' | 'mute'
export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth' | 'swing'
export interface Meter { numerator: number; denominator: 2 | 4 | 8 | 16; accents: BeatAccent[] }
export interface BeatEvent { beatIndex: number; subdivisionIndex: number; accent: BeatAccent; isMainBeat: boolean; offsetBeats: number }
```

Implement `defaultAccents`, `normalizeAccents`, `clampBpm`, and `cycleAccent` with explicit handling for 3/4, 4/4, and 6/8.

- [ ] **Step 4: Write failing subdivision tests**

```ts
expect(buildBarEvents(settingsFor('eighth'))).toHaveLength(8)
expect(buildBarEvents(settingsFor('triplet'))).toHaveLength(12)
expect(buildBarEvents(settingsFor('sixteenth'))).toHaveLength(16)
expect(buildBarEvents(settingsFor('swing')).map(event => event.offsetBeats)).toEqual([
  0, 2 / 3, 1, 1 + 2 / 3, 2, 2 + 2 / 3, 3, 3 + 2 / 3,
])
```

- [ ] **Step 5: Implement `buildBarEvents` and verify**

Run: `pnpm test -- src/rhythm`
Expected: meter and sequence tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/domain src/rhythm
git commit -m "feat: add rhythm and meter domain"
```

## Task 3: Implement Tap Tempo and both practice state machines

**Files:**
- Create: `src/rhythm/tapTempo.ts`, `src/rhythm/tapTempo.test.ts`
- Create: `src/training/tempoTrainer.ts`, `src/training/tempoTrainer.test.ts`
- Create: `src/training/quietCount.ts`, `src/training/quietCount.test.ts`

- [ ] **Step 1: Test Tap Tempo filtering**

```ts
expect(calculateTapTempo([0, 500, 1000, 1500])).toBe(120)
expect(calculateTapTempo([0, 500, 1000, 5000])).toBeNull()
```

The final assertion establishes that a timeout starts a new tap series rather than averaging stale input.

- [ ] **Step 2: Implement a bounded rolling tap series**

Use the last 2–6 valid intervals, reject intervals outside the 20–400 BPM range, and reset after a 2-second gap.

- [ ] **Step 3: Test tempo-program transitions**

```ts
const next = advanceTempoStage(createTempoSession({
  startBpm: 60, targetBpm: 64, stepBpm: 2,
  changeEveryBars: 2, targetBehavior: 'reverse', repetitions: 2,
}), 2)
expect(next.currentBpm).toBe(62)
```

Add cases for increasing, decreasing, target clamping, hold, restart, reverse, finite completion, pause, and invalid direction.

- [ ] **Step 4: Implement the tempo state machine**

Expose only pure functions:

```ts
createTempoSession(program: TempoProgram): TempoSession
advanceTempoStage(session: TempoSession, completedBars: number): TempoSession
pauseTempoSession(session: TempoSession): TempoSession
resumeTempoSession(session: TempoSession): TempoSession
```

- [ ] **Step 5: Test and implement Quiet Count**

```ts
const session = createQuietCountSession({ audibleBars: 2, silentBars: 1, repetitions: 2, hideVisuals: true })
expect(advanceQuietCount(session, 2).phase).toBe('silent')
expect(advanceQuietCount(session, 3).phase).toBe('audible')
```

Inject a random-number function for deterministic random-range tests.

- [ ] **Step 6: Verify and commit**

Run: `pnpm test -- src/rhythm/tapTempo.test.ts src/training`
Expected: all trainer tests pass.

```powershell
git add src/rhythm/tapTempo* src/training
git commit -m "feat: add tempo and quiet count trainers"
```

## Task 4: Add versioned presets and safe import/export

**Files:**
- Create: `src/storage/presetSchema.ts`, `src/storage/presetSchema.test.ts`
- Create: `src/storage/presetStore.ts`, `src/storage/presetStore.test.ts`

- [ ] **Step 1: Write failing schema tests**

```ts
expect(PresetExportSchema.safeParse(validExport).success).toBe(true)
expect(PresetExportSchema.safeParse({ schemaVersion: 1, presets: [{ bpm: 9999 }] }).success).toBe(false)
```

- [ ] **Step 2: Define Zod schemas matching the domain**

Use a top-level structure:

```ts
interface PresetExport {
  schemaVersion: 1
  exportedAt: string
  presets: Preset[]
}
```

Validate names, BPM, meter bounds, accent count, sound, trainer values, and repetitions.

- [ ] **Step 3: Test the repository with injected Storage**

```ts
const store = createPresetStore(memoryStorage)
store.save(preset)
expect(store.list()).toEqual([preset])
expect(store.loadLastSettings()).toEqual(DEFAULT_SETTINGS)
```

- [ ] **Step 4: Implement safe persistence**

Provide `list`, `save`, `remove`, `loadLastSettings`, `saveLastSettings`, `exportJson`, and `importJson`. Corrupt stored JSON must return safe defaults without deleting the original key.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test -- src/storage`
Expected: schema and repository tests pass.

```powershell
git add src/storage
git commit -m "feat: add versioned local presets"
```

## Task 5: Build the testable look-ahead scheduler

**Files:**
- Create: `src/audio/audioTypes.ts`
- Create: `src/audio/BeatScheduler.ts`, `src/audio/BeatScheduler.test.ts`
- Create: `src/audio/scheduler.worker.ts`

- [ ] **Step 1: Write a fake-clock scheduler test**

```ts
const scheduler = new BeatScheduler({ clock, sink, scheduleAheadSeconds: 0.1 })
scheduler.start(config)
clock.now = 0.05
scheduler.tick()
expect(sink.scheduled.map(item => item.when)).toEqual([0, 0.5])
```

Add tests for no duplicate schedules, BPM change, pause, stop/reset, mute events, subdivision timing, and disposal.

- [ ] **Step 2: Define the audio boundary**

```ts
export interface AudioClock { now(): number }
export interface ClickSink {
  schedule(event: BeatEvent, when: number): ScheduledClick | null
  cancelAfter(when: number): void
}
export interface ScheduledClick { when: number; cancel(): void }
```

- [ ] **Step 3: Implement minimal scheduling logic**

The scheduler keeps `nextEventIndex`, `nextEventTime`, bar/beat counters, and a queue of visual events. `tick()` fills only the look-ahead window and skips muted events while still advancing musical position.

- [ ] **Step 4: Add Worker wake-up messages**

The worker posts `{ type: 'tick' }` every 25 ms after `start` and stops on `stop`; it does not calculate music time.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test -- src/audio/BeatScheduler.test.ts`
Expected: scheduler tests pass without a real AudioContext.

```powershell
git add src/audio
git commit -m "feat: add look-ahead beat scheduler"
```

## Task 6: Add the browser Web Audio engine and click timbres

**Files:**
- Create: `src/audio/AudioEngine.ts`, `src/audio/AudioEngine.test.ts`
- Modify: `src/audio/audioTypes.ts`

- [ ] **Step 1: Test lifecycle behavior through an injected adapter**

```ts
await engine.ensureReady()
await engine.ensureReady()
expect(adapter.createContext).toHaveBeenCalledTimes(1)
engine.stop()
expect(adapter.cancelledFutureClicks()).toBe(true)
```

- [ ] **Step 2: Generate reusable in-memory click buffers**

Generate short buffers for `classic`, `woodblock`, and `sticks`, with strong/medium/weak variants. Use decaying envelopes and bounded gain; do not fetch remote audio.

- [ ] **Step 3: Schedule buffer sources against audio time**

`AudioEngine.schedule(event, when)` selects the correct buffer, connects gain to the destination, starts exactly at `when`, and returns a cancellable handle.

- [ ] **Step 4: Handle browser suspension and visibility safely**

`ensureReady()` resumes a suspended context after a user gesture. `suspend()` cancels future clicks and suspends the scheduler; `dispose()` closes owned resources.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test -- src/audio`
Expected: all pure and adapter-based audio tests pass.

```powershell
git add src/audio
git commit -m "feat: add browser click audio engine"
```

## Task 7: Create React orchestration and runtime controls

**Files:**
- Create: `src/hooks/useMetronome.ts`, `src/hooks/useMetronome.test.tsx`
- Create: `src/hooks/useWakeLock.ts`, `src/hooks/useWakeLock.test.tsx`
- Create: `src/components/TransportButton.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Test the hook through an injected engine factory**

```tsx
expect(result.current.runtime.status).toBe('stopped')
await act(() => result.current.actions.play())
expect(fakeEngine.start).toHaveBeenCalledOnce()
act(() => result.current.actions.setBpm(128))
expect(fakeEngine.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ bpm: 128 }))
```

- [ ] **Step 2: Implement a reducer-backed controller**

Expose:

```ts
{
  settings,
  runtime: { status, beatIndex, barNumber, elapsedSeconds, visualQueue },
  trainer,
  actions: { play, pause, stop, setBpm, tap, setMeter, setSubdivision, cycleAccent, setTrainer }
}
```

Keep engine instances in refs and settings in reducer state. Save valid settings through the storage repository.

- [ ] **Step 3: Test visibility and Wake Lock handling**

The hook requests `navigator.wakeLock.request('screen')` only while playing, releases on pause/unmount, and exposes `unsupported`, `requesting`, `active`, or `released` status.

- [ ] **Step 4: Implement keyboard commands**

Space toggles playback, ArrowUp/Down adjusts by 1 BPM, Shift+Arrow adjusts by 5 BPM, and T records Tap Tempo. Ignore shortcuts while typing in an input/select/textarea.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test -- src/hooks src/components/TransportButton*`
Expected: hook and transport tests pass.

```powershell
git add src/hooks src/components src/App.tsx
git commit -m "feat: connect metronome runtime to React"
```

## Task 8: Implement the String Pulse interface

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/app.css`
- Create: `src/components/StringPulse.tsx`, `src/components/StringPulse.test.tsx`
- Create: `src/components/TempoControls.tsx`, `src/components/TempoControls.test.tsx`
- Create: `src/components/QuickSettings.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Test visible beat and tempo controls**

```tsx
render(<StringPulse meter={meter} activeBeat={2} hideVisuals={false} />)
expect(screen.getByText('3')).toHaveAttribute('aria-current', 'true')

await user.click(screen.getByRole('button', { name: '提高 1 BPM' }))
expect(onBpmChange).toHaveBeenCalledWith(97)
```

- [ ] **Step 2: Implement the six-string signature element**

Render six semantic decorative lines and one numbered node per main beat. Strong, medium, weak, mute, active, and hidden states receive separate classes and accessible labels.

- [ ] **Step 3: Implement the centered BPM controls**

Use a numeric input, 20–400 range slider, step buttons, and Tap Tempo. The large displayed value uses tabular numerals and the interactive input remains properly labeled.

- [ ] **Step 4: Apply the selected visual system**

Use these tokens as the starting palette:

```css
:root {
  --paper: #f4f0e7;
  --ink: #17211d;
  --copper: #c86738;
  --moss: #67766a;
  --line: #d4ccbf;
  --focus: #176b87;
}
```

Use flat sections and hairline rules rather than repeated floating cards. Keep the transport reachable near the bottom of a 360×640 viewport.

- [ ] **Step 5: Verify responsiveness and commit**

Run: `pnpm test -- src/components/StringPulse.test.tsx src/components/TempoControls.test.tsx && pnpm build`
Expected: tests and build pass.

```powershell
git add src/styles src/components src/App.tsx src/main.tsx
git commit -m "feat: build String Pulse metronome interface"
```

## Task 9: Add settings, accent editing, and trainer controls

**Files:**
- Create: `src/components/SettingsSheet.tsx`, `src/components/SettingsSheet.test.tsx`
- Create: `src/components/AccentEditor.tsx`, `src/components/AccentEditor.test.tsx`
- Create: `src/components/TrainerPanel.tsx`, `src/components/TrainerPanel.test.tsx`
- Modify: `src/App.tsx`, `src/styles/app.css`

- [ ] **Step 1: Test direct settings workflows**

```tsx
await user.click(screen.getByRole('button', { name: /拍号 4\/4/ }))
await user.selectOptions(screen.getByLabelText('拍号分子'), '6')
expect(onMeterChange).toHaveBeenCalledWith(expect.objectContaining({ numerator: 6 }))

await user.click(screen.getByRole('button', { name: /第 2 拍：弱拍/ }))
expect(onAccentChange).toHaveBeenCalledWith(1, 'mute')
```

- [ ] **Step 2: Implement mobile sheet and desktop rail**

One component changes layout through CSS media queries. It uses tabs for rhythm, sound, training, timer, and presets; opening a quick setting selects the matching tab.

- [ ] **Step 3: Implement validated trainer forms**

Prevent start when target direction conflicts with start/target values. Show explicit inline errors and derived summaries such as “60 → 100 BPM，每 8 小节 +2，往返 3 次”.

- [ ] **Step 4: Integrate Quiet Count visual hiding**

When the quiet session is silent and `hideVisuals` is true, preserve layout dimensions but remove active-beat indication and explanatory count text.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test -- src/components/SettingsSheet.test.tsx src/components/AccentEditor.test.tsx src/components/TrainerPanel.test.tsx`
Expected: component workflows pass.

```powershell
git add src/components src/App.tsx src/styles/app.css
git commit -m "feat: add rhythm and practice controls"
```

## Task 10: Add presets, focus mode, and session completion

**Files:**
- Create: `src/components/PresetPanel.tsx`, `src/components/PresetPanel.test.tsx`
- Create: `src/components/FocusMode.tsx`, `src/components/FocusMode.test.tsx`
- Modify: `src/App.tsx`, `src/hooks/useMetronome.ts`, `src/styles/app.css`

- [ ] **Step 1: Test preset save/load/import**

```tsx
await user.type(screen.getByLabelText('预设名称'), '音阶热身')
await user.click(screen.getByRole('button', { name: '保存预设' }))
expect(store.save).toHaveBeenCalledWith(expect.objectContaining({ name: '音阶热身' }))
```

Add invalid import and delete confirmation tests.

- [ ] **Step 2: Implement export and import UI**

Export with a Blob download; import from a local file, parse through `PresetExportSchema`, display validation errors, and never execute file content.

- [ ] **Step 3: Test and build focus mode**

Focus mode displays large beat pillars, BPM, bar/session progress, transport, volume, and exit. It uses the Fullscreen API when available but remains usable as an in-page overlay when unavailable.

- [ ] **Step 4: Implement count-in and completion behavior**

The hook must distinguish count-in bars from tracked practice bars, pause timers while paused, and play one non-startling completion cue.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test -- src/components/PresetPanel.test.tsx src/components/FocusMode.test.tsx src/hooks/useMetronome.test.tsx`
Expected: preset, focus, and completion tests pass.

```powershell
git add src/components src/hooks src/App.tsx src/styles/app.css
git commit -m "feat: add presets and focus practice mode"
```

## Task 11: Add end-to-end coverage and GitHub Pages automation

**Files:**
- Create: `playwright.config.ts`, `playwright/metronome.spec.ts`
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- Modify: `vite.config.ts`, `README.md`

- [ ] **Step 1: Write failing browser workflows**

Cover:

```ts
test('changes tempo, meter, accent, and restores settings after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('BPM').fill('128')
  await page.getByRole('button', { name: /拍号/ }).click()
  await page.getByLabel('拍号分子').selectOption('3')
  await page.reload()
  await expect(page.getByLabel('BPM')).toHaveValue('128')
})
```

Add a 360×800 no-horizontal-overflow test and a trainer configuration smoke test.

- [ ] **Step 2: Configure Playwright web server**

Run Vite on a fixed local port, use Chromium in CI, and retain traces/screenshots only on failure.

- [ ] **Step 3: Configure repository-aware Vite base**

```ts
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
export default defineConfig({
  base: process.env.GITHUB_ACTIONS && repository ? `/${repository}/` : '/',
})
```

- [ ] **Step 4: Add CI workflow**

Use Node 24, pnpm/action-setup v4, actions/checkout v5, and actions/setup-node v5. Run `pnpm install --frozen-lockfile`, `pnpm check`, install Playwright Chromium, then run E2E tests.

- [ ] **Step 5: Add Pages workflow**

Use `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, and `actions/deploy-pages@v4`, with Pages permissions, environment URL, and deployment concurrency.

- [ ] **Step 6: Document local use and deployment**

README must include install, development, tests, build, GitHub Pages settings, keyboard shortcuts, local-only storage limitations, and browser audio behavior.

- [ ] **Step 7: Verify and commit**

Run:

```powershell
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
```

Expected: lint, unit tests, build, and E2E tests all exit 0.

```powershell
git add .github playwright playwright.config.ts vite.config.ts README.md
git commit -m "ci: add browser tests and Pages deployment"
```

## Task 12: Final requirement audit and release verification

**Files:**
- Modify only files required by failures found during the audit.

- [ ] **Step 1: Compare implementation against every section of the design spec**

Create a temporary checklist covering UI A, audio timing, meter/subdivision, accent states, tempo trainer, Quiet Count, timers, presets, accessibility, visibility pause, Wake Lock, and deployment. Do not mark a requirement complete solely because a neighboring test passes.

- [ ] **Step 2: Run the complete verification suite**

```powershell
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Expected: all commands exit 0 with zero failing tests.

- [ ] **Step 3: Inspect the production application at phone and desktop widths**

Verify 360×800, 768×1024, and 1440×900. Confirm no horizontal overflow, visible focus, reduced-motion behavior, reachable transport, sheet/rail behavior, and focus mode.

- [ ] **Step 4: Run Git and artifact checks**

```powershell
git status --short
git diff --check
git log --oneline --decorate -12
```

Expected: clean status, no whitespace errors, and small feature commits matching the plan.

- [ ] **Step 5: Commit audit-only corrections if necessary**

```powershell
git add <only-the-corrected-files>
git commit -m "fix: address final metronome verification findings"
```
