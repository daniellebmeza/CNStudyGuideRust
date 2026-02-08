# CN Study Guide (Rust + Tauri)

## Overview
A three-level cranial nerve study guide built with Tauri + React. Data is loaded from `CN study guide - Sheet2.csv` and supports multiple-choice questions, flash cards, and swallowing role prompts.

## Data File
- Required columns: `name`, `type`, `function` (accepts `Fuction` typo for `function`).
- Optional column: `role in swallowing`.
- Valid type values: `sensory`, `motor`, `both`.
- `role in swallowing` values of `none` or empty are normalized to empty.

## Development
1. Install dependencies:

```bash
npm install
```

2. Run the app:

```bash
npm run tauri dev
```

The dev CSV fallback loads from the project root:
`CN study guide - Sheet2.csv`

## Build (Release)

```bash
npm run tauri build
```

The release bundle includes the CSV from `src-tauri/resources/CN study guide - Sheet2.csv` (configured in `src-tauri/tauri.conf.json`).

## Rust Tests

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

## Notes
- Update both `CN study guide - Sheet2.csv` at the project root and `src-tauri/resources/CN study guide - Sheet2.csv` when refreshing the dataset.
- Level 3 is disabled automatically if no entries include a swallowing role.
