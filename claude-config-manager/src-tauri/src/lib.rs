use serde::Serialize;
use std::path::{PathBuf};
use std::env;
use std::fs;

#[derive(Serialize)]
pub struct ConfigPathInfo {
    pub path: String,
    pub exists: bool,
}

#[derive(Serialize)]
pub struct ConfigPaths {
    pub enterprise: EnterprisePaths,
    pub user: UserPaths,
}

#[derive(Serialize)]
pub struct EnterprisePaths {
    pub claude_md: ConfigPathInfo,
    pub settings: ConfigPathInfo,
}

#[derive(Serialize)]
pub struct UserPaths {
    pub claude_md: ConfigPathInfo,
    pub settings: ConfigPathInfo,
    pub settings_local: ConfigPathInfo,
    pub agents: ConfigPathInfo,
    pub commands: ConfigPathInfo,
}

#[tauri::command]
fn get_config_paths() -> ConfigPaths {
    let home = env::var("HOME").or_else(|_| env::var("USERPROFILE")).unwrap_or_else(|_| ".".to_string());
    let home_path = PathBuf::from(home);
    
    let enterprise_base = if cfg!(target_os = "windows") {
        PathBuf::from("C:\\Program Files\\ClaudeCode")
    } else if cfg!(target_os = "macos") {
        PathBuf::from("/Library/Application Support/ClaudeCode")
    } else {
        PathBuf::from("/etc/claude-code")
    };

    let make_info = |pb: PathBuf| {
        ConfigPathInfo {
            exists: pb.exists(),
            path: pb.to_string_lossy().into_owned(),
        }
    };
    
    ConfigPaths {
        enterprise: EnterprisePaths {
            claude_md: make_info(enterprise_base.join("CLAUDE.md")),
            settings: make_info(enterprise_base.join("settings.json")),
        },
        user: UserPaths {
            claude_md: make_info(home_path.join(".claude").join("CLAUDE.md")),
            settings: make_info(home_path.join(".claude").join("settings.json")),
            settings_local: make_info(home_path.join(".claude").join("settings.local.json")),
            agents: make_info(home_path.join(".claude").join("agents")),
            commands: make_info(home_path.join(".claude").join("commands")),
        },
    }
}

#[tauri::command]
fn file_exists(path: String) -> bool {
    PathBuf::from(path).exists()
}

#[derive(Serialize)]
pub struct ProjectInfo {
    pub id: String,
    pub path: String,
    pub name: String,
    pub has_claude_md: bool,
}

#[tauri::command]
fn list_projects(base_dir: String) -> Vec<ProjectInfo> {
    let mut projects = Vec::new();
    if let Ok(entries) = fs::read_dir(base_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
                let has_claude_md = path.join("CLAUDE.md").exists() || path.join(".claude").join("CLAUDE.md").exists();
                let is_project = has_claude_md || 
                               path.join(".git").exists() || 
                               path.join("package.json").exists() ||
                               path.join("tsconfig.json").exists() ||
                               path.join("pyproject.toml").exists() ||
                               path.join("go.mod").exists() ||
                               path.join("Cargo.toml").exists();
                
                if is_project {
                    projects.push(ProjectInfo {
                        id: name.clone(),
                        path: path.to_string_lossy().into_owned(),
                        name,
                        has_claude_md,
                    });
                }
            }
        }
    }
    projects
}
#[tauri::command]
fn read_config_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_config_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_config_paths,
            file_exists,
            read_config_file,
            save_config_file,
            list_projects
        ])
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        let window = app.get_webview_window("main").unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
