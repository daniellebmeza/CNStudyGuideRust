#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod study;

use study::{
    build_level1_round, build_level2_round, build_level3_round, load_entries_from_path,
    Level1Round, Level2Round, Level3Round, StudyEntry,
};

#[tauri::command]
fn load_entries(app_handle: tauri::AppHandle) -> Result<Vec<StudyEntry>, String> {
    let file_name = "CN study guide - Sheet2.csv";
    let resource_path = app_handle.path_resolver().resolve_resource(file_name);
    if let Some(path) = resource_path {
        if path.exists() {
            return load_entries_from_path(&path);
        }
    }

    let dev_path = std::env::current_dir()
        .map_err(|err| format!("Failed to resolve current directory: {}", err))?
        .join(file_name);
    if dev_path.exists() {
        return load_entries_from_path(&dev_path);
    }

    Err(format!(
        "CSV file not found. Expected resource '{}' or dev path '{}'.",
        file_name,
        dev_path.display()
    ))
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
