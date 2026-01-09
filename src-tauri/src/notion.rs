use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize, Serialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub status: String,
    pub do_date: Option<String>,
    pub objective_name: Option<String>,
    pub objective_deadline: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub id: String,
    pub title: String,
}

// Notion API Response Structures

#[derive(Debug, Deserialize)]
pub struct SearchResponse {
    pub results: Vec<DatabaseObject>,
}

#[derive(Debug, Deserialize)]
pub struct DatabaseObject {
    pub id: String,
    pub title: Option<Vec<RichText>>, // Databases use 'title' array
}

#[derive(Debug, Deserialize)]
pub struct QueryResponse {
    pub results: Vec<Page>,
}

#[derive(Debug, Deserialize)]
pub struct Page {
    pub id: String,
    pub properties: HashMap<String, PropertyValue>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum PropertyValue {
    Title {
        title: Vec<RichText>,
    },
    Date {
        date: Option<DateValue>,
    },
    Checkbox {
        checkbox: bool,
    },
    Rollup {
        rollup: Option<RollupValue>,
    },
    // Fallback for others
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
pub struct RichText {
    pub plain_text: String,
}

#[derive(Debug, Deserialize)]
pub struct DateValue {
    pub start: String,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum RollupValue {
    Array {
        array: Vec<RollupProperty>,
    },
    Date {
        date: Option<DateValue>,
    },
    #[serde(other)]
    Unknown,
}

// Rollup inner properties can be Date, Title (RichText), etc.
// But Notion rollups are often arrays of primitive property values.
// Simplified handling:
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum RollupProperty {
    Title {
        title: Vec<RichText>,
    },
    Date {
        date: Option<DateValue>,
    },
    Formula {
        formula: FormulaValue,
    },
    // Fallback
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum FormulaValue {
    Date {
        date: Option<DateValue>,
    },
    #[serde(other)]
    Unknown,
}
