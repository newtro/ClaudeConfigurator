import { create } from 'zustand';
import { getConfigPaths, ConfigPaths, listProjects, ProjectConfigFiles } from '@/lib/paths';

interface Project {
    id: string;
    path: string;
    name: string;
    hasClaudeMd: boolean;
    config_files: ProjectConfigFiles;
}

interface ConfigState {
    paths: ConfigPaths | null;
    projects: Project[];
    selectedFilePath: string | null;
    isLoading: boolean;
    error: string | null;
    apiKey: string | null;
    scanBaseDir: string | null;
    theme: 'light' | 'dark' | 'system';
    isSettingsOpen: boolean;
    primaryModel: string;
    codingModel: string;
    validationModel: string;
    viewMode: string;

    initialize: () => Promise<void>;
    scanProjects: (baseDir?: string) => Promise<void>;
    setSelectedFilePath: (path: string | null) => void;
    setApiKey: (key: string) => void;
    setScanBaseDir: (dir: string) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setSettingsOpen: (open: boolean) => void;
    setPrimaryModel: (model: string) => void;
    setCodingModel: (model: string) => void;
    setValidationModel: (model: string) => void;
    setViewMode: (mode: string) => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
    paths: null,
    projects: [],
    selectedFilePath: null,
    isLoading: false,
    error: null,
    apiKey: localStorage.getItem('anthropic_api_key'),
    scanBaseDir: localStorage.getItem('scan_base_dir'),
    theme: (localStorage.getItem('app_theme') as any) || 'system',
    isSettingsOpen: false,
    primaryModel: localStorage.getItem('anthropic_primary_model') || 'claude-sonnet-4-5',
    codingModel: localStorage.getItem('anthropic_coding_model') || 'claude-opus-4-5',
    validationModel: localStorage.getItem('anthropic_validation_model') || 'claude-haiku-4-5',
    viewMode: localStorage.getItem('editor_view_mode') || 'default',

    initialize: async () => {
        set({ isLoading: true, error: null });
        try {
            const paths = await getConfigPaths();
            set({ paths });

            // Also refresh projects if we have a base dir
            const state = get();
            if (state.scanBaseDir) {
                await state.scanProjects();
            }

            set({ isLoading: false });
        } catch (err) {
            set({ error: (err as any).toString(), isLoading: false });
        }
    },

    scanProjects: async (baseDir?: string) => {
        const dir = baseDir || get().scanBaseDir;
        if (!dir) return;

        set({ isLoading: true, error: null });
        try {
            const projectsData = await listProjects(dir);
            const projects = projectsData.map(p => ({
                id: p.id,
                path: p.path,
                name: p.name,
                hasClaudeMd: p.has_claude_md,
                config_files: p.config_files
            }));
            set({ projects, isLoading: false });
        } catch (err) {
            set({ error: (err as any).toString(), isLoading: false });
        }
    },

    setSelectedFilePath: (path: string | null) => set({ selectedFilePath: path }),

    setApiKey: (key: string) => {
        localStorage.setItem('anthropic_api_key', key);
        set({ apiKey: key });
    },

    setScanBaseDir: (dir: string) => {
        localStorage.setItem('scan_base_dir', dir);
        set({ scanBaseDir: dir });
    },

    setTheme: (theme) => {
        localStorage.setItem('app_theme', theme);
        set({ theme });
    },

    setSettingsOpen: (open) => set({ isSettingsOpen: open }),

    setPrimaryModel: (model: string) => {
        localStorage.setItem('anthropic_primary_model', model);
        set({ primaryModel: model });
    },

    setCodingModel: (model: string) => {
        localStorage.setItem('anthropic_coding_model', model);
        set({ codingModel: model });
    },

    setValidationModel: (model: string) => {
        localStorage.setItem('anthropic_validation_model', model);
        set({ validationModel: model });
    },
    setViewMode: (mode: string) => {
        localStorage.setItem('editor_view_mode', mode);
        set({ viewMode: mode });
    },
}));
