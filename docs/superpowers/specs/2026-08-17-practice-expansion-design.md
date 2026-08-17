# Guitar Practice Expansion Design

**Date:** 2026-08-17

## Goal

Extend the existing lightweight guitar practice PWA with six related capabilities while preserving GitHub Pages compatibility, offline use, mobile usability, and timing stability:

1. Jam count-in.
2. Chord-change trainer.
3. Multiple chord voicings.
4. Jam sections and section-end drum fills.
5. Key detection/selection and scale recommendations.
6. Metronome practice-song library.

## Product decisions

- New Jam sessions use a one-bar count-in by default; users can select 0, 1, or 2 bars.
- Existing saved Jam sessions migrate without an unexpected count-in (`0` bars) and retain their progression.
- A Jam arrangement contains one to three fixed sections: A / 主段, B / 副段, C / 桥段. Each section has 4, 8, or 12 bars and its own optional end fill.
- First release plays sections in A → B → C order and loops the full arrangement. It does not add arbitrary drag-and-drop arrangement ordering.
- Chord voicings are generated from checked open, E-shape, A-shape, and power-chord templates. Unsupported qualities keep the existing standard voicing rather than inventing unreliable shapes.
- Chord-change training alternates two selected chords on a click track. Controls cover BPM, 2/4/8 beats per chord, and 1/3/5 minute sessions.
- Jam key is explicit and transposes the whole arrangement. Scale suggestions are practice guidance derived from key/mode and chord qualities, not harmonic guarantees for every melody note.
- Song entries contain recommended practice speed ranges. They are not represented as authoritative original-recording BPM values.

## Data model

### Jam

`JamSession` moves from a flat `{ bars, progression }` shape to:

- `countInBars: 0 | 1 | 2`
- `key: JamKey`
- `mode: 'major' | 'minor'`
- `sections: JamSection[]`
- existing BPM, meter, style, and mix fields

`JamSection` contains an id, localized name, bar count, progression, and `fill` flag. A pure `buildJamTimeline()` flattens the arrangement for scheduling and UI lookup. `buildJamEvents()` works on that timeline and adds an explicit fill pattern in the last bar of enabled sections.

Storage becomes `six-string-jam-v2`. The loader validates v2 with Zod, otherwise migrates a valid v1 payload, otherwise returns a cloned default session.

### Chord voicings

The existing 51-name catalog remains the source of chord identity, notes, intervals, and its standard shape. A separate lazy-module `chordVoicings.ts` exposes `ChordVoicing` and `getChordVoicings(chord)`. This keeps the Jam path from importing UI-only voicing generation.

### Chord-change training

A pure model maps elapsed beat index to current chord, next chord, local beat, and switch count. A dedicated Web Audio click engine owns the same `chords` audio session as chord preview, so preview and training cannot overlap.

### Practice songs

A lazy-loaded catalog stores title, artist, difficulty, style, meter, start BPM, target BPM, and a short practice focus. Selecting a speed calls existing metronome `setBpm` and `setMeter` actions.

## Scheduling and performance

- Jam count-in is scheduled on the audio clock before the first music event. Pause/resume skips count-in; stop/play and reset use it.
- Jam position callbacks fire only when the visible phase/bar/beat changes, replacing the current 30ms state-update behavior.
- Jam storage writes are debounced and flushed on cleanup.
- Chord lookup uses a map; resolved MIDI and generated voicings are cached.
- The song library is loaded with `React.lazy`, so the metronome entry bundle does not include the catalog until requested.
- UI animations remain transform/opacity based and respect the existing reduced-motion rules.

## UI structure

### Jam

- Transport settings add count-in.
- A section rail selects A/B/C and supports add, duplicate, and delete.
- The progression grid edits only the selected section; playback highlights the actual section and bar.
- Each section exposes an end-fill toggle.
- A key/scale panel shows key, major/minor mode, and three note-chip recommendations.
- During count-in the now-playing card shows preparation bar and beat instead of a chord.

### Chord

- A voicing selector sits above the large fretboard and changes both diagram and preview sound.
- A chord-change trainer panel sits below the chord detail and shares the existing chord catalog.

### Metronome

- A `曲目` header action opens a responsive practice-library drawer.
- Search and filters are local; each item has slow-start and target-speed actions.

## Testing

- Unit tests cover timeline flattening, fills, count-in cues, transposition/key updates, scale notes, v1 migration, voicing generation/deduplication, chord-change state mapping, and song-catalog validity.
- Component tests cover voicing selection, trainer controls, and song-speed application where practical.
- Existing lint, Vitest, PWA checks, bundle budgets, and Playwright suites remain required.
- Add Playwright smoke coverage for Jam section/count-in controls, Chord voicing/trainer presence, and the lazy song drawer at mobile and desktop widths.
