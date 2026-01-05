import { invoke } from "@tauri-apps/api/core";

export interface ConfigPathInfo {
    path: string;
    exists: boolean;
    is_dir: boolean;
}

export interface EnterprisePaths {
    claude_md: ConfigPathInfo;                 // Enterprise CLAUDE.md
    managed_mcp: ConfigPathInfo;               // managed-mcp.json
    managed_settings: ConfigPathInfo;          // managed-settings.json
}

export interface UserPaths {
    claude_md: ConfigPathInfo;                 // ~/.claude/CLAUDE.md
    claude_local_md: ConfigPathInfo;           // ~/.claude/CLAUDE.local.md
    settings: ConfigPathInfo;                  // ~/.claude/settings.json
    settings_local: ConfigPathInfo;            // ~/.claude/settings.local.json
    agents: ConfigPathInfo;                    // ~/.claude/agents/
    commands: ConfigPathInfo;                  // ~/.claude/commands/
    mcp: ConfigPathInfo;                       // ~/.claude.json (MCP servers)
    skills: ConfigPathInfo;                    // ~/.claude/skills/
}

export interface ConfigPaths {
    enterprise: EnterprisePaths;
    user: UserPaths;
}

export async function getConfigPaths(): Promise<ConfigPaths> {
    return await invoke<ConfigPaths>("get_config_paths");
}

export async function checkFileExists(path: string): Promise<boolean> {
    return await invoke<boolean>("file_exists", { path });
}

export async function getPathInfo(path: string): Promise<ConfigPathInfo> {
    return await invoke<ConfigPathInfo>("get_path_info", { path });
}

export async function readConfigFile(path: string): Promise<string> {
    return await invoke<string>("read_config_file", { path });
}

export async function saveConfigFile(path: string, content: string): Promise<void> {
    await invoke("save_config_file", { path, content });
}

export interface ProjectConfigFiles {
    claude_md_root: ConfigPathInfo;           // [ProjectRoot]/CLAUDE.md
    claude_md_dotclaude: ConfigPathInfo;      // [ProjectRoot]/.claude/CLAUDE.md
    claude_local_md: ConfigPathInfo;          // [ProjectRoot]/CLAUDE.local.md
    settings: ConfigPathInfo;                  // [ProjectRoot]/.claude/settings.json
    settings_local: ConfigPathInfo;            // [ProjectRoot]/.claude/settings.local.json
    rules: ConfigPathInfo;                     // [ProjectRoot]/.claude/rules/
    commands: ConfigPathInfo;                  // [ProjectRoot]/.claude/commands/
    agents: ConfigPathInfo;                    // [ProjectRoot]/.claude/agents/
    skills: ConfigPathInfo;                    // [ProjectRoot]/.claude/skills/
    mcp: ConfigPathInfo;                       // [ProjectRoot]/.mcp.json
}

export interface ProjectInfo {
    id: string;
    path: string;
    name: string;
    has_claude_md: boolean;
    config_files: ProjectConfigFiles;
}

export async function listProjects(baseDir: string): Promise<ProjectInfo[]> {
    return await invoke<ProjectInfo[]>("list_projects", { baseDir });
}

// Subdirectory CLAUDE.md discovery
export interface SubdirClaudeMd {
    relative_path: string;    // e.g., "src/billing"
    full_path: string;        // e.g., "C:/Projects/MyApp/src/billing/CLAUDE.md"
    exists: boolean;
}

export async function discoverSubdirectoryClaudeMd(
    projectPath: string,
    maxDepth?: number
): Promise<SubdirClaudeMd[]> {
    return await invoke<SubdirClaudeMd[]>("discover_subdirectory_claude_md", {
        projectPath,
        maxDepth
    });
}

// Enterprise paths are read-only (require admin privileges to write)
// These patterns match the enterprise base directories
const ENTERPRISE_PATH_PATTERNS = [
    /^C:\\Program Files\\ClaudeCode/i,           // Windows
    /^\/Library\/Application Support\/ClaudeCode/i,  // macOS
    /^\/etc\/claude-code/i,                      // Linux/WSL
];

/**
 * Check if a path is an enterprise-managed path (read-only for regular users)
 */
export function isEnterprisePath(path: string): boolean {
    return ENTERPRISE_PATH_PATTERNS.some(pattern => pattern.test(path));
}

// Directory listing
export interface DirectoryEntry {
    name: string;
    path: string;
    is_dir: boolean;
}

export async function listDirectory(path: string): Promise<DirectoryEntry[]> {
    return await invoke<DirectoryEntry[]>("list_directory", { path });
}

export async function deletePath(path: string): Promise<void> {
    await invoke("delete_path", { path });
}

export async function createDirectory(path: string): Promise<void> {
    await invoke("create_directory", { path });
}
