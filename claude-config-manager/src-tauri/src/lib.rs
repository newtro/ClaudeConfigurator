use serde::Serialize;
use std::path::{PathBuf};
use std::env;
use std::fs;

#[derive(Serialize)]
pub struct ConfigPathInfo {
    pub path: String,
    pub exists: bool,
    pub is_dir: bool,
}

#[derive(Serialize)]
pub struct ConfigPaths {
    pub enterprise: EnterprisePaths,
    pub user: UserPaths,
}

#[derive(Serialize)]
pub struct EnterprisePaths {
    pub claude_md: ConfigPathInfo,              // Enterprise CLAUDE.md
    pub managed_mcp: ConfigPathInfo,
    pub managed_settings: ConfigPathInfo,
}

#[derive(Serialize)]
pub struct UserPaths {
    pub claude_md: ConfigPathInfo,              // ~/.claude/CLAUDE.md
    pub claude_local_md: ConfigPathInfo,        // ~/.claude/CLAUDE.local.md
    pub settings: ConfigPathInfo,               // ~/.claude/settings.json
    pub settings_local: ConfigPathInfo,         // ~/.claude/settings.local.json
    pub agents: ConfigPathInfo,                 // ~/.claude/agents/
    pub commands: ConfigPathInfo,               // ~/.claude/commands/
    pub mcp: ConfigPathInfo,                    // ~/.claude.json (MCP servers)
    pub skills: ConfigPathInfo,                 // ~/.claude/skills/
}

#[tauri::command]
fn get_config_paths() -> ConfigPaths {
    let home = env::var("HOME").or_else(|_| env::var("USERPROFILE")).unwrap_or_else(|_| ".".to_string());
    let home_path = PathBuf::from(home);

    // Enterprise paths per official docs:
    // - Windows: C:\Program Files\ClaudeCode\
    // - macOS: /Library/Application Support/ClaudeCode/
    // - Linux/WSL: /etc/claude-code/
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
            is_dir: pb.is_dir(),
            path: pb.to_string_lossy().into_owned(),
        }
    };

    ConfigPaths {
        enterprise: EnterprisePaths {
            claude_md: make_info(enterprise_base.join("CLAUDE.md")),
            managed_mcp: make_info(enterprise_base.join("managed-mcp.json")),
            managed_settings: make_info(enterprise_base.join("managed-settings.json")),
        },
        user: UserPaths {
            claude_md: make_info(home_path.join(".claude").join("CLAUDE.md")),
            claude_local_md: make_info(home_path.join(".claude").join("CLAUDE.local.md")),
            settings: make_info(home_path.join(".claude").join("settings.json")),
            settings_local: make_info(home_path.join(".claude").join("settings.local.json")),
            agents: make_info(home_path.join(".claude").join("agents")),
            commands: make_info(home_path.join(".claude").join("commands")),
            mcp: make_info(home_path.join(".claude.json")),
            skills: make_info(home_path.join(".claude").join("skills")),
        },
    }
}

#[tauri::command]
fn file_exists(path: String) -> bool {
    PathBuf::from(path).exists()
}

#[tauri::command]
fn get_path_info(path: String) -> ConfigPathInfo {
    let pb = PathBuf::from(path);
    ConfigPathInfo {
        exists: pb.exists(),
        is_dir: pb.is_dir(),
        path: pb.to_string_lossy().into_owned(),
    }
}

#[derive(Serialize)]
pub struct ProjectConfigFiles {
    pub claude_md_root: ConfigPathInfo,           // [ProjectRoot]/CLAUDE.md
    pub claude_md_dotclaude: ConfigPathInfo,      // [ProjectRoot]/.claude/CLAUDE.md
    pub claude_local_md: ConfigPathInfo,          // [ProjectRoot]/CLAUDE.local.md
    pub settings: ConfigPathInfo,                  // [ProjectRoot]/.claude/settings.json
    pub settings_local: ConfigPathInfo,            // [ProjectRoot]/.claude/settings.local.json
    pub rules: ConfigPathInfo,                     // [ProjectRoot]/.claude/rules/
    pub commands: ConfigPathInfo,                  // [ProjectRoot]/.claude/commands/
    pub agents: ConfigPathInfo,                    // [ProjectRoot]/.claude/agents/
    pub skills: ConfigPathInfo,                    // [ProjectRoot]/.claude/skills/
    pub mcp: ConfigPathInfo,                       // [ProjectRoot]/.mcp.json
}

#[derive(Serialize)]
pub struct ProjectInfo {
    pub id: String,
    pub path: String,
    pub name: String,
    pub has_claude_md: bool,
    pub config_files: ProjectConfigFiles,
}

#[tauri::command]
fn list_projects(base_dir: String) -> Vec<ProjectInfo> {
    let mut projects = Vec::new();

    let make_info = |pb: PathBuf| {
        ConfigPathInfo {
            exists: pb.exists(),
            is_dir: pb.is_dir(),
            path: pb.to_string_lossy().into_owned(),
        }
    };

    if let Ok(entries) = fs::read_dir(base_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
                let claude_md_root = path.join("CLAUDE.md");
                let claude_md_dotclaude = path.join(".claude").join("CLAUDE.md");
                let has_claude_md = claude_md_root.exists() || claude_md_dotclaude.exists();

                let is_project = has_claude_md ||
                               path.join(".git").exists() ||
                               path.join("package.json").exists() ||
                               path.join("tsconfig.json").exists() ||
                               path.join("pyproject.toml").exists() ||
                               path.join("go.mod").exists() ||
                               path.join("Cargo.toml").exists();

                if is_project {
                    let config_files = ProjectConfigFiles {
                        claude_md_root: make_info(claude_md_root),
                        claude_md_dotclaude: make_info(claude_md_dotclaude),
                        claude_local_md: make_info(path.join("CLAUDE.local.md")),
                        settings: make_info(path.join(".claude").join("settings.json")),
                        settings_local: make_info(path.join(".claude").join("settings.local.json")),
                        rules: make_info(path.join(".claude").join("rules")),
                        commands: make_info(path.join(".claude").join("commands")),
                        agents: make_info(path.join(".claude").join("agents")),
                        skills: make_info(path.join(".claude").join("skills")),
                        mcp: make_info(path.join(".mcp.json")),
                    };

                    projects.push(ProjectInfo {
                        id: name.clone(),
                        path: path.to_string_lossy().into_owned(),
                        name,
                        has_claude_md,
                        config_files,
                    });
                }
            }
        }
    }
    projects
}
#[derive(Serialize)]
pub struct SubdirClaudeMd {
    pub relative_path: String,    // e.g., "src/billing"
    pub full_path: String,        // e.g., "C:/Projects/MyApp/src/billing/CLAUDE.md"
    pub exists: bool,
}

/// Recursively discover CLAUDE.md files in subdirectories of a project
#[tauri::command]
fn discover_subdirectory_claude_md(project_path: String, max_depth: Option<u32>) -> Vec<SubdirClaudeMd> {
    let mut results = Vec::new();
    let base = PathBuf::from(&project_path);
    let max_depth = max_depth.unwrap_or(5);

    fn recurse(
        base: &PathBuf,
        current: &PathBuf,
        depth: u32,
        max_depth: u32,
        results: &mut Vec<SubdirClaudeMd>,
    ) {
        if depth > max_depth {
            return;
        }

        if let Ok(entries) = fs::read_dir(current) {
            for entry in entries.flatten() {
                let path = entry.path();

                // Skip hidden directories (except .claude which we already handle at project level)
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.starts_with('.') {
                        continue;
                    }
                }

                // Skip common non-source directories
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if matches!(name, "node_modules" | "target" | "dist" | "build" | "__pycache__" | "vendor" | ".git") {
                        continue;
                    }
                }

                if path.is_dir() {
                    // Check for CLAUDE.md in this subdirectory
                    let claude_md_path = path.join("CLAUDE.md");
                    if claude_md_path.exists() {
                        let relative = path.strip_prefix(base).unwrap_or(&path);
                        results.push(SubdirClaudeMd {
                            relative_path: relative.to_string_lossy().into_owned(),
                            full_path: claude_md_path.to_string_lossy().into_owned(),
                            exists: true,
                        });
                    }

                    // Also check for CLAUDE.local.md
                    let claude_local_path = path.join("CLAUDE.local.md");
                    if claude_local_path.exists() {
                        let relative = path.strip_prefix(base).unwrap_or(&path);
                        results.push(SubdirClaudeMd {
                            relative_path: format!("{} (local)", relative.to_string_lossy()),
                            full_path: claude_local_path.to_string_lossy().into_owned(),
                            exists: true,
                        });
                    }

                    // Recurse into subdirectory
                    recurse(base, &path, depth + 1, max_depth, results);
                }
            }
        }
    }

    recurse(&base, &base, 0, max_depth, &mut results);
    results
}

#[tauri::command]
fn read_config_file(path: String) -> Result<String, String> {
    let pb = PathBuf::from(&path);
    if pb.is_dir() {
        return Err("This path is a directory. Please select a file within it to view its contents.".into());
    }
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_config_file(path: String, content: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    if let Some(parent) = path_buf.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, content).map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<DirectoryEntry>, String> {
    let mut entries = Vec::new();

    let read_dir = fs::read_dir(&path).map_err(|e| e.to_string())?;

    for entry in read_dir.flatten() {
        let entry_path = entry.path();
        let name = entry_path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned();

        entries.push(DirectoryEntry {
            name,
            path: entry_path.to_string_lossy().into_owned(),
            is_dir: entry_path.is_dir(),
        });
    }

    // Sort: directories first, then files, both alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[tauri::command]
fn delete_path(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);

    if path_buf.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_config_paths,
            file_exists,
            get_path_info,
            read_config_file,
            save_config_file,
            list_projects,
            discover_subdirectory_claude_md,
            list_directory,
            delete_path,
            create_directory
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
