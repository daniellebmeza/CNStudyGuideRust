# CNStudyGuideRust Task Breakdown

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

## Behavior Parity Snapshot
- [x] Data file: `CN study guide - Sheet2.csv` (UTF-8 with BOM).
- [x] Required columns: name, type, function. Accept `Fuction` typo as function.
- [x] Optional column: role in swallowing.
- [x] Valid type values: sensory, motor, both.
- [x] role_in_swallowing normalization: empty or "none" -> "".
- [x] Preserve row index as `order` for reference, but shuffle entries per round.
- [x] Level registry: level_1 (multiple choice), level_2 (flash cards), level_3 (swallowing roles).

## Level Flow (Global)
1. App opens on level_select with buttons for level 1, level 2, level 3.
2. Clicking a level opens level_title with subtitle and Start/Back.
3. Start begins the round; Back returns to level_select.
4. Each level runs through a shuffled list of entries.
5. Summary screen shows totals and actions.
6. Retry actions rebuild the round using failed_entries only.
7. Restart actions return to level_select.

## Level 1 Flow (Multiple Choice)
1. Build level1_round from all entries or failed_entries.
2. For each question, show function as the prompt.
3. Provide name options: correct name plus up to 3 random other names, total max 4, shuffled.
4. Provide type options: Sensory, Motor, Both.
5. User must select name and type, then submit.
6. Correct only if both match; otherwise add to failed_entries.
7. After last question, show summary (correct/wrong/total).
8. Enable "Retry Failed" only when failed_entries is non-empty.
9. "Next Level" goes to level 2 title page.

## Level 2 Flow (Flash Cards)
1. Build level2_round from all entries or failed_entries.
2. Card front shows nerve name.
3. Flip card to reveal "Type: {type_label}" and "Function: {function}".
4. Require flip before allowing Correct/Incorrect.
5. Score answer, track failed_entries.
6. After last card, show summary (correct/wrong/total).
7. Enable "Retry Failed" only when failed_entries is non-empty.
8. "Restart Game" returns to level_select.

## Level 3 Flow (Swallowing Roles)
1. Build level3_round from entries with non-empty role_in_swallowing.
2. If no eligible entries, show "Level 3 Unavailable" and return to level_select.
3. Card front shows role_in_swallowing text.
4. Flip card to reveal nerve name.
5. Require flip before allowing Correct/Incorrect.
6. Score answer, track failed_entries.
7. After last card, show summary (correct/wrong/total).
8. Enable "Retry Failed" only when failed_entries is non-empty.
9. "Restart Game" returns to level_select.

## Rust + Tauri Core Tasks
- [x] Create a Tauri + React project in `CNStudyGuideRust`.
- [x] Define shared serde models: `study_entry`, `level1_question`, `level1_round`, `level2_round`, `level3_round`, `level_summary`.
- [x] Implement CSV loader in Rust using `csv` and `serde`.
- [x] Normalize headers by lowercasing and stripping spaces; map `fuction` -> `function`.
- [x] Validate type values against sensory/motor/both; return errors with row index.
- [x] Normalize role_in_swallowing and treat "none" as empty.
- [x] Implement RNG shuffle (use `rand`) for round creation.
- [x] Implement level1 question generation with name options (max 4).
- [x] Implement retry logic that rebuilds rounds from failed_entries.
- [x] Expose Tauri commands to load entries and advance rounds.
- [x] Handle level_3 unavailable error and return user-friendly message.

## React UI Tasks
- [x] Build view state machine mirroring the stacked page flow.
- [x] Components: level_select, level_title, level1_question, level1_summary, level2_card, level2_summary, level3_card, level3_summary.
- [x] Wire actions to Tauri commands and update local state.
- [x] Enforce flip-before-score guard on level 2 and level 3.
- [x] Add styling to match existing layout (centered titles, card frame, button hierarchy).
- [x] Optional: fade-in animation on level_title.

## Packaging and Docs
- [x] Bundle `CN study guide - Sheet2.csv` as a Tauri resource.
- [x] Provide dev fallback path to load the CSV from project root.
- [x] Write run/build instructions for dev and release.

## Testing and Validation
- [x] Unit tests for CSV parsing, header normalization, and type validation.
- [x] Unit tests for level1 name option generation and retry flow.
- [x] Unit tests for level3 eligibility filter.
- [ ] Manual test pass for all level flows and summary actions.
