use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::Path;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NerveType {
    Sensory,
    Motor,
    Both,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct StudyEntry {
    pub name: String,
    #[serde(rename = "type")]
    pub type_value: NerveType,
    pub function: String,
    pub role_in_swallowing: String,
    pub order: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Level1Question {
    pub entry: StudyEntry,
    pub name_options: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Level1Round {
    pub questions: Vec<Level1Question>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Level2Round {
    pub entries: Vec<StudyEntry>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Level3Round {
    pub entries: Vec<StudyEntry>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct LevelSummary {
    pub correct: usize,
    pub wrong: usize,
    pub total: usize,
}

pub fn normalize_header(header: &str) -> String {
    let trimmed = header.trim().trim_start_matches('\u{feff}');
    let lowered = trimmed.to_lowercase();
    let no_spaces = lowered.replace(' ', "");
    match no_spaces.as_str() {
        "fuction" => "function".to_string(),
        "role_in_swallowing" => "roleinswallowing".to_string(),
        _ => no_spaces,
    }
}

pub fn normalize_role(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("none") {
        return String::new();
    }
    trimmed.to_string()
}

pub fn parse_type(value: &str, row_index: usize) -> Result<NerveType, String> {
    let normalized = value.trim().to_lowercase();
    match normalized.as_str() {
        "sensory" => Ok(NerveType::Sensory),
        "motor" => Ok(NerveType::Motor),
        "both" => Ok(NerveType::Both),
        "" => Err(format!("Row {}: missing type value", row_index)),
        _ => Err(format!(
            "Row {}: invalid type '{}'. Expected sensory, motor, or both",
            row_index,
            value.trim()
        )),
    }
}

pub fn load_entries_from_path(path: &Path) -> Result<Vec<StudyEntry>, String> {
    let mut file =
        File::open(path).map_err(|err| format!("Failed to open {}: {}", path.display(), err))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|err| format!("Failed to read {}: {}", path.display(), err))?;
    load_entries_from_reader(&buffer[..])
}

pub fn load_entries_from_reader<R: Read>(reader: R) -> Result<Vec<StudyEntry>, String> {
    let mut csv_reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(reader);

    let headers = csv_reader
        .headers()
        .map_err(|err| format!("Failed to read CSV headers: {}", err))?
        .clone();

    let mut header_map: HashMap<String, usize> = HashMap::new();
    for (index, header) in headers.iter().enumerate() {
        let normalized = normalize_header(header);
        if !normalized.is_empty() {
            header_map.insert(normalized, index);
        }
    }

    let name_index = header_map
        .get("name")
        .copied()
        .ok_or_else(|| "Missing required column: name".to_string())?;
    let type_index = header_map
        .get("type")
        .copied()
        .ok_or_else(|| "Missing required column: type".to_string())?;
    let function_index = header_map
        .get("function")
        .copied()
        .ok_or_else(|| "Missing required column: function".to_string())?;
    let role_index = header_map.get("roleinswallowing").copied();

    let mut entries = Vec::new();
    for (row_offset, record_result) in csv_reader.records().enumerate() {
        let row_index = row_offset + 1;
        let record = record_result
            .map_err(|err| format!("Row {}: failed to read record: {}", row_index, err))?;

        let name = record
            .get(name_index)
            .unwrap_or_default()
            .trim()
            .to_string();
        if name.is_empty() {
            return Err(format!("Row {}: missing name value", row_index));
        }

        let type_value = record.get(type_index).unwrap_or_default();
        let nerve_type = parse_type(type_value, row_index)?;

        let function = record
            .get(function_index)
            .unwrap_or_default()
            .trim()
            .to_string();
        if function.is_empty() {
            return Err(format!("Row {}: missing function value", row_index));
        }

        let role_in_swallowing = role_index
            .and_then(|index| record.get(index))
            .map(normalize_role)
            .unwrap_or_default();

        entries.push(StudyEntry {
            name,
            type_value: nerve_type,
            function,
            role_in_swallowing,
            order: row_index,
        });
    }

    Ok(entries)
}

pub fn build_level1_round(entries: &[StudyEntry]) -> Level1Round {
    let mut rng = rand::thread_rng();
    let mut shuffled_entries = entries.to_vec();
    shuffled_entries.shuffle(&mut rng);

    let all_names: Vec<String> = entries.iter().map(|entry| entry.name.clone()).collect();

    let questions = shuffled_entries
        .into_iter()
        .map(|entry| {
            let mut options = vec![entry.name.clone()];
            let mut other_names: Vec<String> = all_names
                .iter()
                .filter(|name| *name != &entry.name)
                .cloned()
                .collect();
            other_names.shuffle(&mut rng);

            for name in other_names.into_iter().take(3) {
                options.push(name);
            }

            options.shuffle(&mut rng);

            Level1Question {
                entry,
                name_options: options,
            }
        })
        .collect();

    Level1Round { questions }
}

pub fn build_level2_round(entries: &[StudyEntry]) -> Level2Round {
    let mut rng = rand::thread_rng();
    let mut shuffled_entries = entries.to_vec();
    shuffled_entries.shuffle(&mut rng);
    Level2Round {
        entries: shuffled_entries,
    }
}

pub fn build_level3_round(entries: &[StudyEntry]) -> Result<Level3Round, String> {
    let mut rng = rand::thread_rng();
    let mut eligible_entries: Vec<StudyEntry> = entries
        .iter()
        .cloned()
        .filter(|entry| !entry.role_in_swallowing.trim().is_empty())
        .collect();

    if eligible_entries.is_empty() {
        return Err("Level 3 Unavailable: no swallowing role entries found".to_string());
    }

    eligible_entries.shuffle(&mut rng);
    Ok(Level3Round {
        entries: eligible_entries,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    fn sample_entry(
        name: &str,
        type_value: NerveType,
        function: &str,
        role: &str,
        order: usize,
    ) -> StudyEntry {
        StudyEntry {
            name: name.to_string(),
            type_value,
            function: function.to_string(),
            role_in_swallowing: role.to_string(),
            order,
        }
    }

    #[test]
    fn normalize_header_handles_bom_and_typo() {
        assert_eq!(normalize_header("\u{feff}Name"), "name");
        assert_eq!(normalize_header(" Fuction "), "function");
        assert_eq!(normalize_header("role in swallowing"), "roleinswallowing");
        assert_eq!(normalize_header("role_in_swallowing"), "roleinswallowing");
    }

    #[test]
    fn parse_type_validates_values() {
        assert_eq!(parse_type("Sensory", 1).unwrap(), NerveType::Sensory);
        assert_eq!(parse_type("motor", 2).unwrap(), NerveType::Motor);
        assert_eq!(parse_type("Both", 3).unwrap(), NerveType::Both);
        assert!(parse_type("mixed", 4).is_err());
    }

    #[test]
    fn load_entries_normalizes_headers_and_roles() {
        let data = "\u{feff}name,type,fuction,role in swallowing\nOlfactory,sensory,Smell,none\nVagus,both,Parasympathetic,Pharyngeal phase\n";
        let entries = load_entries_from_reader(Cursor::new(data)).expect("load entries");

        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].order, 1);
        assert_eq!(entries[0].role_in_swallowing, "");
        assert_eq!(entries[1].role_in_swallowing, "Pharyngeal phase");
    }

    #[test]
    fn build_level1_round_includes_correct_name() {
        let entries = vec![
            sample_entry("I", NerveType::Sensory, "Smell", "", 1),
            sample_entry("II", NerveType::Sensory, "Vision", "", 2),
            sample_entry("III", NerveType::Motor, "Eye movement", "", 3),
            sample_entry("IV", NerveType::Motor, "Eye movement", "", 4),
            sample_entry("V", NerveType::Both, "Face", "", 5),
        ];

        let round = build_level1_round(&entries);
        assert_eq!(round.questions.len(), entries.len());

        for question in round.questions {
            assert!(question.name_options.contains(&question.entry.name));
            assert!(question.name_options.len() <= 4);
        }
    }

    #[test]
    fn build_level1_round_supports_retry_lists() {
        let entries = vec![
            sample_entry("I", NerveType::Sensory, "Smell", "", 1),
            sample_entry("II", NerveType::Sensory, "Vision", "", 2),
            sample_entry("III", NerveType::Motor, "Eye movement", "", 3),
        ];
        let failed_entries = vec![entries[1].clone(), entries[2].clone()];
        let round = build_level1_round(&failed_entries);

        assert_eq!(round.questions.len(), failed_entries.len());
    }

    #[test]
    fn build_level3_round_filters_entries() {
        let entries = vec![
            sample_entry("I", NerveType::Sensory, "Smell", "", 1),
            sample_entry("IX", NerveType::Both, "Taste", "Pharyngeal phase", 2),
        ];

        let round = build_level3_round(&entries).expect("level3 round");
        assert_eq!(round.entries.len(), 1);
        assert_eq!(round.entries[0].name, "IX");

        let no_roles = vec![sample_entry("I", NerveType::Sensory, "Smell", "", 1)];
        assert!(build_level3_round(&no_roles).is_err());
    }
}
