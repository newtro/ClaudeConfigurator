import { create } from 'zustand';
import { getConfigPaths, ConfigPaths, listProjects } from '@/lib/paths';

interface Project {
    id: string;
    path: string;
    name: string;
    hasClaudeMd: boolean;
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

    initialize: () => Promise<void>;
    scanProjects: (baseDir?: string) => Promise<void>;
    setSelectedFilePath: (path: string | null) => void;
    setApiKey: (key: string) => void;
    setScanBaseDir: (dir: string) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setSettingsOpen: (open: boolean) => void;
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
                hasClaudeMd: p.has_claude_md
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
}));
