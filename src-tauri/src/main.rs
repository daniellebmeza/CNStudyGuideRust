#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod study;

use std::io::Cursor;

use study::{
    build_level1_round, build_level2_round, build_level3_round, load_entries_from_reader,
    Level1Round, Level2Round, Level3Round, StudyEntry,
};

const EMBEDDED_CSV: &[u8] = include_bytes!("../CN study guide - Sheet2.csv");

#[tauri::command]
fn load_entries(_app_handle: tauri::AppHandle) -> Result<Vec<StudyEntry>, String> {
    load_entries_from_reader(Cursor::new(EMBEDDED_CSV)).map_err(|err| {
        format!(
            "Failed to parse embedded CSV at compile-time path 'src-tauri/CN study guide - Sheet2.csv': {}",
            err
        )
    })
}

#[tauri::command]
fn build_level1_round_command(entries: Vec<StudyEntry>) -> Result<Level1Round, String> {
    if entries.is_empty() {
        return Err("No entries available for Level 1".to_string());
    }
    Ok(build_level1_round(&entries))
}

#[tauri::command]
fn build_level2_round_command(entries: Vec<StudyEntry>) -> Result<Level2Round, String> {
    if entries.is_empty() {
        return Err("No entries available for Level 2".to_string());
    }
    Ok(build_level2_round(&entries))
}

#[tauri::command]
fn build_level3_round_command(entries: Vec<StudyEntry>) -> Result<Level3Round, String> {
    build_level3_round(&entries)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_entries,
            build_level1_round_command,
            build_level2_round_command,
            build_level3_round_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
