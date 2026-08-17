# Guitar Practice Expansion Implementation Plan

**Date:** 2026-08-17

## 1. Jam domain and migration

- Modify `src/jam/jamModel.ts`
  - add count-in, key/mode, section, timeline, fill, and scale recommendation types/functions
  - keep style generation pure and deterministic
- Modify `src/jam/jamStorage.ts`
  - add v2 schema, v1 migration, defensive cloning
- Extend `src/jam/jamModel.test.ts` and `src/jam/jamStorage.test.ts` first

## 2. Jam scheduler and UI

- Modify `src/jam/JamAudioEngine.ts`
  - support count-in phase and arrangement position metadata
  - schedule count-in clicks
  - remove duplicate visual notifications
- Extend `src/jam/JamAudioEngine.test.ts`
- Refactor `src/jam/JamPage.tsx`
  - section controls, per-section progression, fill toggle
  - key/mode and scale recommendations
  - count-in control and phase display
  - debounced persistence
- Extend `src/styles/app.css` for responsive Jam controls

## 3. Chord multiple voicings

- Add `src/chords/chordVoicings.ts`
- Add `src/chords/chordVoicings.test.ts`
- Generalize `src/chords/Fretboard.tsx` and `src/chords/ChordAudioEngine.ts` to accept a playable/display chord shape
- Refactor `src/chords/ChordPage.tsx` with a voicing selector

## 4. Chord-change trainer

- Add `src/chords/chordChangeModel.ts` and its unit tests
- Add `src/chords/ChordChangeEngine.ts`
- Add `src/chords/ChordChangeTrainer.tsx`
- Integrate with `ChordPage` and the shared `chords` audio-session owner
- Add responsive styles and focused component coverage

## 5. Metronome practice library

- Add `src/practice/practiceSongs.ts` and validity tests
- Add lazy `src/practice/PracticeLibrary.tsx`
- Modify `src/App.tsx` to open the drawer and apply BPM/meter through existing actions
- Add component/E2E coverage and responsive styles

## 6. Performance hardening

- Cache chord lookup/MIDI/voicings
- Debounce Jam persistence
- Ensure Jam UI position updates only once per beat/phase
- Verify lazy chunks and existing gzip budgets
- Check 360px layout for overflow and touch target size

## 7. Documentation, verification, and delivery

- Update `README.md` with all new capabilities and controls
- Run targeted tests during implementation
- Run `pnpm lint`, `pnpm test`, `pnpm build`, and relevant Playwright smoke/full suites
- Inspect the production bundle report and Git diff
- Commit all verified changes directly to `master`; do not push unless requested
