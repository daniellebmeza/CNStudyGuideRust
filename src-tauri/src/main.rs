#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod study;

use std::io::Cursor;
use std::path::PathBuf;

use study::{
    build_level1_round, build_level2_round, build_level3_round, load_entries_from_path,
    load_entries_from_reader,
    Level1Round, Level2Round, Level3Round, StudyEntry,
};

const CSV_FILE_NAME: &str = "CN study guide - Sheet2.csv";
const CSV_RESOURCE_PATH: &str = "resources/CN study guide - Sheet2.csv";
const EMBEDDED_CSV: &[u8] = include_bytes!("../resources/CN study guide - Sheet2.csv");

#[tauri::command]
fn load_entries(app_handle: tauri::AppHandle) -> Result<Vec<StudyEntry>, String> {
    let mut attempted_paths: Vec<String> = Vec::new();

    for resource_name in [CSV_FILE_NAME, CSV_RESOURCE_PATH] {
        if let Some(path) = app_handle.path_resolver().resolve_resource(resource_name) {
            attempted_paths.push(path.display().to_string());
            if path.exists() {
                return load_entries_from_path(&path);
            }
        } else {
            attempted_paths.push(format!("resolve_resource({}) -> <none>", resource_name));
        }
    }

    let mut dev_paths = vec![
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join(CSV_FILE_NAME),
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(CSV_FILE_NAME),
    ];

    if let Ok(cwd) = std::env::current_dir() {
        dev_paths.push(cwd.join(CSV_FILE_NAME));
        dev_paths.push(cwd.join("src-tauri").join("resources").join(CSV_FILE_NAME));
        dev_paths.push(cwd.join("src-tauri").join(CSV_FILE_NAME));
    }

    for path in dev_paths {
        attempted_paths.push(path.display().to_string());
        if path.exists() {
            return load_entries_from_path(&path);
        }
    }

    load_entries_from_reader(Cursor::new(EMBEDDED_CSV)).map_err(|err| {
        format!(
            "CSV file not found from disk paths and embedded fallback failed: {}. Attempted: {}",
            err,
            attempted_paths.join(", ")
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
