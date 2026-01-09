use notion::{PropertyValue, QueryResponse, RollupProperty, RollupValue, Task};

mod notion;

#[tauri::command]
async fn fetch_tasks(token: String, database_id: String) -> Result<Vec<Task>, String> {
    let client = reqwest::Client::new();
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let query_body = serde_json::json!({
        "filter": {
            "and": [
                {
                    "property": "Checkbox",
                    "checkbox": {
                        "equals": false
                    }
                },
                {
                    "property": "Date",
                    "date": {
                        "on_or_before": today
                    }
                }
            ]
        }
    });

    let res = client
        .post(format!(
            "https://api.notion.com/v1/databases/{}/query",
            database_id
        ))
        .header("Authorization", format!("Bearer {}", token))
        .header("Notion-Version", "2022-06-28")
        .json(&query_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let error_text = res.text().await.unwrap_or_default();
        return Err(format!("Notion API Error: {}", error_text));
    }

    let body_text = res.text().await.unwrap_or_default();
    let query_res: QueryResponse = serde_json::from_str(&body_text).map_err(|e| {
        let snippet: String = body_text.chars().take(500).collect();
        format!("JSON Parse Error: {}. Snippet: {}", e, snippet)
    })?;

    let tasks: Vec<Task> = query_res
        .results
        .into_iter()
        .map(|page| {
            let title = match page.properties.get("Task Name") {
                Some(PropertyValue::Title { title }) => title
                    .first()
                    .map(|t| t.plain_text.clone())
                    .unwrap_or_default(),
                _ => "Untitled".to_string(),
            };

            let status = match page.properties.get("Checkbox") {
                Some(PropertyValue::Checkbox { checkbox }) => {
                    if *checkbox {
                        "Done".to_string()
                    } else {
                        "To Do".to_string()
                    }
                }
                _ => "To Do".to_string(),
            };

            let do_date = match page.properties.get("Date") {
                Some(PropertyValue::Date { date }) => date.as_ref().map(|d| d.start.clone()),
                _ => None,
            };

            // Handle Rollups (Strategy linked to Objective Name/Deadline)
            // We assume the user has created 'Objective Name' and 'Objective Deadline' rollups
            // derived from the 'Strategy' relation.
            let objective_name = match page.properties.get("Objective Name") {
                Some(PropertyValue::Rollup {
                    rollup: Some(RollupValue::Array { array }),
                }) => {
                    // Find the first Title
                    array.iter().find_map(|p| match p {
                        RollupProperty::Title { title } => {
                            title.first().map(|t| t.plain_text.clone())
                        }
                        _ => None,
                    })
                }
                _ => None,
            };

            let objective_deadline = match page.properties.get("Objective Deadline") {
                Some(PropertyValue::Rollup { rollup }) => {
                    match rollup {
                        Some(RollupValue::Array { array }) => {
                            // Find the first Date, either directly or via Formula
                            array.iter().find_map(|p| match p {
                                RollupProperty::Date { date } => {
                                    date.as_ref().map(|d| d.start.clone())
                                }
                                RollupProperty::Formula {
                                    formula: notion::FormulaValue::Date { date },
                                } => date.as_ref().map(|d| d.start.clone()),
                                _ => None,
                            })
                        }
                        Some(RollupValue::Date { date }) => date.as_ref().map(|d| d.start.clone()),
                        _ => None,
                    }
                }
                _ => None,
            };

            Task {
                id: page.id,
                title,
                status,
                do_date,
                objective_name,
                objective_deadline,
            }
        })
        .collect();

    Ok(tasks)
}

#[tauri::command]
async fn mark_task_complete(token: String, page_id: String, completed: bool) -> Result<(), String> {
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "properties": {
             "Checkbox": {
                 "checkbox": completed
             }
        }
    });

    let res = client
        .patch(format!("https://api.notion.com/v1/pages/{}", page_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("Notion-Version", "2022-06-28")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let error_text = res.text().await.unwrap_or_default();
        return Err(format!("Notion API Error: {}", error_text));
    }

    Ok(())
}

#[tauri::command]
fn save_api_token(token: String) -> Result<(), String> {
    let entry = keyring::Entry::new("planit-app", "notion-token").map_err(|e| e.to_string())?;
    entry.set_password(&token).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_api_token() -> Result<String, String> {
    let entry = keyring::Entry::new("planit-app", "notion-token").map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_api_token() -> Result<(), String> {
    let entry = keyring::Entry::new("planit-app", "notion-token").map_err(|e| e.to_string())?;
    entry.delete_password().map_err(|e| e.to_string())
}

#[tauri::command]
async fn fetch_databases(token: String) -> Result<Vec<notion::DatabaseInfo>, String> {
    let client = reqwest::Client::new();

    let query_body = serde_json::json!({
        "filter": {
            "value": "database",
            "property": "object"
        },
        "page_size": 100
    });

    let res = client
        .post("https://api.notion.com/v1/search")
        .header("Authorization", format!("Bearer {}", token))
        .header("Notion-Version", "2022-06-28")
        .json(&query_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let error_text = res.text().await.unwrap_or_default();
        return Err(format!("Notion API Error: {}", error_text));
    }

    let search_res: notion::SearchResponse = res.json().await.map_err(|e| e.to_string())?;

    let databases = search_res
        .results
        .into_iter()
        .map(|db| {
            let title = db
                .title
                .unwrap_or_default()
                .first()
                .map(|t| t.plain_text.clone())
                .unwrap_or_else(|| "Untitled Database".to_string());

            notion::DatabaseInfo { id: db.id, title }
        })
        .collect();

    Ok(databases)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        // ... (rest of plugins)
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcut(tauri_plugin_global_shortcut::Shortcut::new(
                    Some(tauri_plugin_global_shortcut::Modifiers::CONTROL),
                    tauri_plugin_global_shortcut::Code::Space,
                ))
                .unwrap()
                .with_handler(|app: &tauri::AppHandle, shortcut, _event| {
                    if shortcut.matches(
                        tauri_plugin_global_shortcut::Modifiers::CONTROL,
                        tauri_plugin_global_shortcut::Code::Space,
                    ) {
                        use tauri::Manager;
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            // Simple Toggle Logic
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
            use tauri::Manager;

            // Create tray menu
            let show_hide = MenuItem::with_id(app, "show_hide", "Show/Hide", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_hide, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show_hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent the window from closing and hide it instead
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            fetch_tasks,
            mark_task_complete,
            save_api_token,
            get_api_token,
            delete_api_token,
            fetch_databases
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
