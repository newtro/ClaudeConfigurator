import { invoke } from "@tauri-apps/api/core";

export interface ConfigPathInfo {
    path: string;
    exists: boolean;
}

export interface EnterprisePaths {
    claude_md: ConfigPathInfo;
    settings: ConfigPathInfo;
}

export interface UserPaths {
    claude_md: ConfigPathInfo;
    settings: ConfigPathInfo;
    settings_local: ConfigPathInfo;
    agents: ConfigPathInfo;
    commands: ConfigPathInfo;
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

export async function readConfigFile(path: string): Promise<string> {
    return await invoke<string>("read_config_file", { path });
}

export async function saveConfigFile(path: string, content: string): Promise<void> {
    await invoke("save_config_file", { path, content });
}

export interface ProjectInfo {
    id: string;
    path: string;
    name: string;
    has_claude_md: boolean;
}

export async function listProjects(baseDir: string): Promise<ProjectInfo[]> {
    return await invoke<ProjectInfo[]>("list_projects", { baseDir });
}
