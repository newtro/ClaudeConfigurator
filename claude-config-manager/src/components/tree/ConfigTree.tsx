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
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
                        />
                        <TreeItem
                            icon={<Settings className="w-4 h-4" />}
                            label="settings.json"
                            path={paths.enterprise.settings.path}
                            exists={paths.enterprise.settings.exists}
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
                        />
                        <TreeItem
                            icon={<Settings className="w-4 h-4" />}
                            label="settings.json"
                            path={paths.user.settings.path}
                            exists={paths.user.settings.exists}
                        />
                        <TreeItem
                            icon={<Settings className="w-4 h-4" />}
                            label="settings.local.json"
                            path={paths.user.settings_local.path}
                            exists={paths.user.settings_local.exists}
                        />
                        <TreeItem
                            icon={<FolderTree className="w-4 h-4" />}
                            label="Agents"
                            path={paths.user.agents.path}
                            exists={paths.user.agents.exists}
                        />
                        <TreeItem
                            icon={<FolderTree className="w-4 h-4" />}
                            label="Commands"
                            path={paths.user.commands.path}
                            exists={paths.user.commands.exists}
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
                        <form onSubmit={handleAddPath} className="flex gap-2 mb-4">
                            <Input
                                size={1}
                                value={newPath}
                                onChange={(e) => setNewPath(e.target.value)}
                                placeholder="Base path (e.g. C:\Repos)"
                                className="h-7 text-[10px]"
                            />
                            <Button size="sm" type="submit" className="h-7 text-[10px] px-2">Scan</Button>
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

function ProjectItem({ project }: { project: { name: string; path: string; hasClaudeMd: boolean } }) {
    const [isOpen, setIsOpen] = useState(false);

    // In a real app, we'd also check for settings.json in the project root
    const claudeMdPath = `${project.path}\\CLAUDE.md`; // Assuming Windows for now as per user_info

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
                    <TreeItem
                        icon={<FileText className="w-3 h-3" />}
                        label="CLAUDE.md"
                        path={claudeMdPath}
                        exists={project.hasClaudeMd}
                    />
                </div>
            )}
        </div>
    );
}

function TreeItem({ icon, label, path, exists = true }: { icon: React.ReactNode; label: string; path: string; exists?: boolean }) {
    const { selectedFilePath, setSelectedFilePath } = useConfigStore();
    const isActive = selectedFilePath === path;

    return (
        <div
            className={cn(
                "group flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/30",
                !exists && "text-muted-foreground/60"
            )}
            onClick={() => setSelectedFilePath(path)}
            title={path}
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
            {!exists && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-medium">
                    Missing
                </span>
            )}
        </div>
    );
}
