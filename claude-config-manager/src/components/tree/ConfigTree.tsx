import { useEffect, useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import {
    FolderTree,
    FileText,
    Settings,
    User,
    Building2,
    Plus,
    ChevronDown,
    ChevronRight,
    Loader2,
    Lock,
    FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { open } from '@tauri-apps/plugin-dialog';

export function ConfigTree() {
    const { paths, projects, initialize, scanProjects, isLoading, error, scanBaseDir, setScanBaseDir } = useConfigStore();
    const [isAddingPath, setIsAddingPath] = useState(false);
    const [newPath, setNewPath] = useState(scanBaseDir || '');

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (scanBaseDir) {
            scanProjects();
        }
    }, [scanBaseDir, scanProjects]);

    const handleAddPath = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPath) {
            setScanBaseDir(newPath);
            setIsAddingPath(false);
            scanProjects(newPath);
        }
    };

    const handleBrowseFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Select Projects Folder',
            });

            if (selected && typeof selected === 'string') {
                setNewPath(selected);
                setScanBaseDir(selected);
                setIsAddingPath(false);
                scanProjects(selected);
            }
        } catch (err) {
            console.error('Failed to open folder dialog:', err);
        }
    };

    if (isLoading && !paths) return <div className="p-4 text-xs text-muted-foreground animate-pulse">Scanning system...</div>;
    if (error) return <div className="p-4 text-xs text-destructive">Error: {error}</div>;
    if (!paths) return null;

    return (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
                {/* Enterprise Level */}
                <section className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Building2 className="w-3 h-3" />
                        Enterprise
                    </div>
                    <div className="space-y-1">
                        <TreeItem
                            icon={<FileText className="w-4 h-4" />}
                            label="CLAUDE.md"
                            path={paths.enterprise.claude_md.path}
                            exists={paths.enterprise.claude_md.exists}
                            description="Enterprise-wide instructions applied to all developers in your organization. Highest priority in the hierarchy."
                            readOnly
                        />
                        <TreeItem
                            icon={<FileText className="w-4 h-4" />}
                            label="managed-mcp.json"
                            path={paths.enterprise.managed_mcp.path}
                            exists={paths.enterprise.managed_mcp.exists}
                            description="Enterprise-wide Model Context Protocol configuration managed by your organization."
                            readOnly
                        />
                        <TreeItem
                            icon={<Settings className="w-4 h-4" />}
                            label="managed-settings.json"
                            path={paths.enterprise.managed_settings.path}
                            exists={paths.enterprise.managed_settings.exists}
                            description="Managed enterprise settings including global security policies and mandatory tool permissions."
                            readOnly
                        />
                    </div>
                </section>

                <Separator />

                {/* User Level */}
                <section className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <User className="w-3 h-3" />
                        User Global
                    </div>
                    <div className="space-y-1">
                        <TreeItem
                            icon={<FileText className="w-4 h-4" />}
                            label="CLAUDE.md"
                            path={paths.user.claude_md.path}
                            exists={paths.user.claude_md.exists}
                            description="Your personal default coding rules and context. Loaded for all projects and applied before project-level instructions."
                        />
                        <TreeItem
                            icon={<FileText className="w-4 h-4" />}
                            label="CLAUDE.local.md"
                            path={paths.user.claude_local_md.path}
                            exists={paths.user.claude_local_md.exists}
                            description="Machine-specific personal instructions. Not synced across devices. Overrides global CLAUDE.md."
                        />
                        <TreeItem
                            icon={<Settings className="w-4 h-4" />}
                            label="settings.json"
                            path={paths.user.settings.path}
                            exists={paths.user.settings.exists}
                            description="Global user preferences, tool permissions, and environment variables for Claude Code."
                        />
                        <TreeItem
                            icon={<Settings className="w-4 h-4" />}
                            label="settings.local.json"
                            path={paths.user.settings_local.path}
                            exists={paths.user.settings_local.exists}
                            description="Local user overrides that are machine-specific and typically ignored by version control."
                        />
                        <TreeItem
                            icon={<FolderTree className="w-4 h-4" />}
                            label="agents/"
                            path={paths.user.agents.path}
                            exists={paths.user.agents.exists}
                            description="Global AI agent (subagent) definitions for complex, multi-step workflows available across all projects."
                        />
                        <TreeItem
                            icon={<FolderTree className="w-4 h-4" />}
                            label="commands/"
                            path={paths.user.commands.path}
                            exists={paths.user.commands.exists}
                            description="Global custom slash commands. Each .md file becomes a command available everywhere."
                        />
                        <TreeItem
                            icon={<Settings className="w-4 h-4" />}
                            label=".claude.json (MCP)"
                            path={paths.user.mcp.path}
                            exists={paths.user.mcp.exists}
                            description="User-level MCP server configuration. Located at ~/.claude.json (not inside .claude folder)."
                        />
                        <TreeItem
                            icon={<FolderTree className="w-4 h-4" />}
                            label="skills/"
                            path={paths.user.skills.path}
                            exists={paths.user.skills.exists}
                            description="Custom modular abilities. Each subfolder contains a SKILL.md defining when and how to use the skill."
                        />
                    </div>
                </section>

                <Separator />

                {/* Projects Level */}
                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <FolderTree className="w-3 h-3" />
                            Projects
                        </div>
                        <button
                            className="p-1 hover:bg-muted rounded-md transition-colors"
                            onClick={() => setIsAddingPath(!isAddingPath)}
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>

                    {isAddingPath && (
                        <form onSubmit={handleAddPath} className="flex gap-1.5 mb-4">
                            <Input
                                size={1}
                                value={newPath}
                                onChange={(e) => setNewPath(e.target.value)}
                                placeholder="Base path (e.g. C:\Repos)"
                                className="h-7 text-[10px] flex-1"
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleBrowseFolder}
                                className="h-7 w-7 p-0 shrink-0"
                                title="Browse for folder"
                            >
                                <FolderOpen className="w-3 h-3" />
                            </Button>
                            <Button size="sm" type="submit" className="h-7 text-[10px] px-2 shrink-0">Scan</Button>
                        </form>
                    )}

                    <div className="space-y-1">
                        {isLoading && projects.length === 0 ? (
                            <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Scanning projects...
                            </div>
                        ) : projects.length > 0 ? (
                            projects.map((project) => (
                                <ProjectItem key={project.id} project={project} />
                            ))
                        ) : (
                            <div className="text-[10px] text-muted-foreground italic px-2">
                                {scanBaseDir ? "No projects found" : "Add a path to scan for projects"}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </ScrollArea>
    );
}

function ProjectItem({ project }: { project: { name: string; path: string; hasClaudeMd: boolean; config_files: import('@/lib/paths').ProjectConfigFiles } }) {
    const [isOpen, setIsOpen] = useState(false);
    const cf = project.config_files;

    return (
        <div className="space-y-0.5">
            <div
                className="group flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                <span className="text-xs font-medium truncate" title={project.path}>{project.name}</span>
            </div>
            {isOpen && (
                <div className="pl-4 space-y-0.5 border-l ml-3.5">
                    {/* Memory Files */}
                    <TreeItem
                        icon={<FileText className="w-3 h-3" />}
                        label="CLAUDE.md"
                        path={cf.claude_md_root.path}
                        exists={cf.claude_md_root.exists}
                        description="Project instructions at root level (most common location). Contains build commands, testing patterns, and project context."
                    />
                    <TreeItem
                        icon={<FileText className="w-3 h-3" />}
                        label=".claude/CLAUDE.md"
                        path={cf.claude_md_dotclaude.path}
                        exists={cf.claude_md_dotclaude.exists}
                        description="Alternative location for project instructions inside the .claude directory."
                    />
                    <TreeItem
                        icon={<FileText className="w-3 h-3" />}
                        label="CLAUDE.local.md"
                        path={cf.claude_local_md.path}
                        exists={cf.claude_local_md.exists}
                        description="Personal project overrides (auto-gitignored). For private preferences like sandbox URLs or test data."
                    />
                    {/* Settings */}
                    <TreeItem
                        icon={<Settings className="w-3 h-3" />}
                        label=".claude/settings.json"
                        path={cf.settings.path}
                        exists={cf.settings.exists}
                        description="Project settings including permissions and MCP servers. Commit to repo to share with team."
                    />
                    <TreeItem
                        icon={<Settings className="w-3 h-3" />}
                        label=".claude/settings.local.json"
                        path={cf.settings_local.path}
                        exists={cf.settings_local.exists}
                        description="Local project overrides (gitignore this). Machine-specific settings that shouldn't be shared."
                    />
                    {/* Rules, Commands, Agents */}
                    <TreeItem
                        icon={<FolderTree className="w-3 h-3" />}
                        label=".claude/rules/"
                        path={cf.rules.path}
                        exists={cf.rules.exists}
                        description="Modular project rules. Each .md file defines topic-specific guidelines (e.g., testing.md, security.md)."
                    />
                    <TreeItem
                        icon={<FolderTree className="w-3 h-3" />}
                        label=".claude/commands/"
                        path={cf.commands.path}
                        exists={cf.commands.exists}
                        description="Project-specific slash commands. Each .md file becomes a command for this project."
                    />
                    <TreeItem
                        icon={<FolderTree className="w-3 h-3" />}
                        label=".claude/agents/"
                        path={cf.agents.path}
                        exists={cf.agents.exists}
                        description="Project-specific subagent definitions for complex workflows unique to this codebase."
                    />
                    <TreeItem
                        icon={<FolderTree className="w-3 h-3" />}
                        label=".claude/skills/"
                        path={cf.skills.path}
                        exists={cf.skills.exists}
                        description="Project-specific skills. Each subfolder contains a SKILL.md defining when and how to use the skill."
                    />
                    {/* MCP */}
                    <TreeItem
                        icon={<Settings className="w-3 h-3" />}
                        label=".mcp.json"
                        path={cf.mcp.path}
                        exists={cf.mcp.exists}
                        description="Project MCP server configuration. Defines project-specific tool integrations and data sources."
                    />
                </div>
            )}
        </div>
    );
}

function TreeItem({
    icon,
    label,
    path,
    exists = true,
    description,
    readOnly = false
}: {
    icon: React.ReactNode;
    label: string;
    path: string;
    exists?: boolean;
    description?: string;
    readOnly?: boolean;
}) {
    const { selectedFilePath, setSelectedFilePath } = useConfigStore();
    const isActive = selectedFilePath === path;

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "group flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-colors",
                            isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/30",
                            !exists && "text-muted-foreground/60"
                        )}
                        onClick={() => setSelectedFilePath(path)}
                    >
                        <span className={cn(
                            isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                            !exists && "text-muted-foreground/40"
                        )}>
                            {icon}
                        </span>
                        <span className={cn(
                            "text-xs truncate flex-1",
                            !exists && "italic"
                        )}>
                            {label}
                        </span>
                        {readOnly && (
                            <Lock className="w-3 h-3 text-blue-500 shrink-0" />
                        )}
                        {!exists && !readOnly && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-medium">
                                Missing
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    className="max-w-[280px] p-3 leading-relaxed border shadow-xl bg-primary text-primary-foreground"
                >
                    <p className="font-bold text-xs mb-1.5">{label}</p>
                    <p className="text-[11px] leading-snug text-primary-foreground/90 mb-2">
                        {description}
                    </p>
                    {readOnly && (
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-300 mb-2">
                            <Lock className="w-3 h-3" />
                            <span>Read-only (managed by IT)</span>
                        </div>
                    )}
                    <div className="border-t border-primary-foreground/10 pt-2 mt-1">
                        <p className="text-[9px] font-medium uppercase tracking-wider opacity-40 mb-1">Path</p>
                        <p className="text-[10px] font-mono break-all opacity-70">{path}</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
