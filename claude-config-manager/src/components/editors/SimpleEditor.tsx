import { useState, useEffect, useMemo } from 'react';
import { readConfigFile, saveConfigFile, getPathInfo, isEnterprisePath, listDirectory, deletePath, DirectoryEntry } from '@/lib/paths';
import { generateFullConfigFile, validateConfigFile } from '@/lib/ai/generators';
import { MonacoEditor } from './MonacoEditor';
import { MarkdownEditor } from './MarkdownEditor';
import { SettingsForm } from './SettingsForm';
import { IgnoreEditor } from './IgnoreEditor';
import { AgentDirectoryView } from './AgentDirectoryView';
import { CommandDirectoryView } from './CommandDirectoryView';
import { SkillDirectoryView } from './SkillDirectoryView';
import { RulesDirectoryView } from './RulesDirectoryView';
import { MCPServerEditor } from './MCPServerEditor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Loader2, Save, FileCode, RefreshCw,
    FileQuestion, Sparkles, Plus, Eye,
    Code, Columns, Settings2, FolderTree, Lock, Building2,
    AlertTriangle, RotateCcw, Trash2, FileText, Folder, Plug
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfigStore } from '@/stores/configStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SimpleEditorProps {
    path: string;
}

export function SimpleEditor({ path }: SimpleEditorProps) {
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [exists, setExists] = useState<boolean>(true);
    const [isDir, setIsDir] = useState<boolean>(false);
    const [dirEntries, setDirEntries] = useState<DirectoryEntry[]>([]);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const { toast } = useToast();
    const { apiKey, initialize, codingModel, viewMode, setViewMode, setSelectedFilePath } = useConfigStore();

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            setDirEntries([]);
            try {
                const info = await getPathInfo(path);
                setExists(info.exists);
                setIsDir(info.is_dir);

                if (info.exists && info.is_dir) {
                    // Load directory contents
                    const entries = await listDirectory(path);
                    setDirEntries(entries);
                } else if (info.exists && !info.is_dir) {
                    const text = await readConfigFile(path);
                    setContent(text);
                }
            } catch (err) {
                toast({
                    title: "Error loading file",
                    description: (err as any).toString(),
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [path, toast]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveConfigFile(path, content);
            toast({
                title: "File saved",
                description: "Your changes have been saved successfully.",
            });
        } catch (err) {
            toast({
                title: "Error saving file",
                description: (err as any).toString(),
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const getLanguage = (filePath: string) => {
        const ext = filePath.split('.').pop()?.toLowerCase();
        if (ext === 'json') return 'json';
        if (ext === 'md') return 'markdown';
        if (ext === 'local' && filePath.includes('settings')) return 'json';
        return 'plaintext';
    };

    const language = getLanguage(path);
    const isReadOnly = isEnterprisePath(path);

    // Validate content and detect issues
    const validation = useMemo(() => {
        if (!content || !exists) return { valid: true, issues: [] };
        const fileName = path.split(/[/\\]/).pop() || '';
        return validateConfigFile(content, fileName, path);
    }, [content, path, exists]);

    const handleCreateEmpty = async () => {
        setIsSaving(true);
        try {
            const initialContent = language === 'json' ? '{}' : '';
            await saveConfigFile(path, initialContent);
            setExists(true);
            setContent(initialContent);
            await initialize(); // Refresh tree
            toast({
                title: "File created",
                description: "An empty file has been created.",
            });
        } catch (err) {
            toast({
                title: "Failed to create file",
                description: (err as any).toString(),
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!apiKey) {
            toast({
                title: "API Key Required",
                description: "Please configure your Anthropic API key in settings.",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);
        try {
            const fileName = path.split(/[/\\]/).pop() || 'file';
            const generated = await generateFullConfigFile(apiKey, fileName, path, "A software project", codingModel);
            await saveConfigFile(path, generated);
            setExists(true);
            setContent(generated);
            await initialize(); // Refresh tree
            toast({
                title: "File generated",
                description: `Successfully generated ${fileName} using AI.`,
            });
        } catch (err) {
            console.error('Generation failed:', err);
            const errorMsg = (err as any).message || (err as any).toString();
            toast({
                title: "Generation failed",
                description: errorMsg,
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerate = async () => {
        if (!apiKey) {
            toast({
                title: "API Key Required",
                description: "Please configure your Anthropic API key in settings.",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);
        try {
            const fileName = path.split(/[/\\]/).pop() || 'file';
            const generated = await generateFullConfigFile(apiKey, fileName, path, "A software project", codingModel);
            setContent(generated);
            toast({
                title: "File regenerated",
                description: `Successfully regenerated ${fileName}. Don't forget to save!`,
            });
        } catch (err) {
            console.error('Regeneration failed:', err);
            const errorMsg = (err as any).message || (err as any).toString();
            toast({
                title: "Regeneration failed",
                description: errorMsg,
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Check if this path SHOULD be a directory but is actually a file
    const shouldBeDirectory = path.endsWith('/agents') || path.endsWith('\\agents') ||
                              path.endsWith('/commands') || path.endsWith('\\commands') ||
                              path.endsWith('/rules') || path.endsWith('\\rules') ||
                              path.endsWith('/skills') || path.endsWith('\\skills') ||
                              path.includes('/agents') || path.includes('\\agents') ||
                              path.includes('/commands') || path.includes('\\commands') ||
                              path.includes('/rules') || path.includes('\\rules') ||
                              path.includes('/skills') || path.includes('\\skills');

    const isFileButShouldBeDir = exists && !isDir && shouldBeDirectory;

    if (isFileButShouldBeDir) {
        const dirName = path.split(/[/\\]/).pop() || 'Directory';

        const handleConvertToDirectory = async () => {
            setIsDeleting(path);
            try {
                // Delete the file
                await deletePath(path);
                // Create the directory by saving an empty file inside it
                const placeholderPath = `${path}/README.md`;
                await saveConfigFile(placeholderPath, `# ${dirName}\n\nThis directory contains ${dirName} configuration files.`);
                // Refresh
                setExists(true);
                setIsDir(true);
                const entries = await listDirectory(path);
                setDirEntries(entries);
                await initialize();
                toast({
                    title: "Converted to directory",
                    description: `${dirName} is now a proper directory.`,
                });
            } catch (err) {
                toast({
                    title: "Conversion failed",
                    description: (err as any).toString(),
                    variant: "destructive",
                });
            } finally {
                setIsDeleting(null);
            }
        };

        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
                <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-6">
                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold tracking-tight mb-2">Invalid Configuration</h2>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                    <code className="px-1.5 py-0.5 bg-muted rounded font-mono text-xs">{dirName}</code> should be a directory but exists as a file.
                    This was likely created incorrectly by a previous generation.
                </p>
                <p className="text-xs text-muted-foreground max-w-md mb-6">
                    Click below to delete the file and create a proper directory structure.
                </p>
                <Button
                    onClick={handleConvertToDirectory}
                    disabled={isDeleting === path}
                    className="gap-2"
                    variant="destructive"
                >
                    {isDeleting === path ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Trash2 className="w-4 h-4" />
                    )}
                    Delete File & Create Directory
                </Button>
            </div>
        );
    }

    if (isDir) {
        const dirName = path.split(/[/\\]/).pop() || 'Directory';

        // Use specialized view for agents directory
        if (dirName === 'agents' || path.endsWith('/agents') || path.endsWith('\\agents')) {
            return <AgentDirectoryView path={path} />;
        }

        // Use specialized view for commands directory
        if (dirName === 'commands' || path.endsWith('/commands') || path.endsWith('\\commands')) {
            return <CommandDirectoryView path={path} />;
        }

        // Use specialized view for skills directory
        if (dirName === 'skills' || path.endsWith('/skills') || path.endsWith('\\skills')) {
            return <SkillDirectoryView path={path} />;
        }

        // Use specialized view for rules directory
        if (dirName === 'rules' || path.endsWith('/rules') || path.endsWith('\\rules')) {
            return <RulesDirectoryView path={path} />;
        }

        const handleDeleteEntry = async (entry: DirectoryEntry) => {
            setIsDeleting(entry.path);
            try {
                await deletePath(entry.path);
                // Refresh directory listing
                const entries = await listDirectory(path);
                setDirEntries(entries);
                await initialize(); // Refresh tree
                toast({
                    title: "Deleted",
                    description: `Successfully deleted ${entry.name}`,
                });
            } catch (err) {
                toast({
                    title: "Delete failed",
                    description: (err as any).toString(),
                    variant: "destructive",
                });
            } finally {
                setIsDeleting(null);
            }
        };

        const handleCreateNewFile = async () => {
            if (!apiKey) {
                toast({
                    title: "API Key Required",
                    description: "Please configure your Anthropic API key in settings.",
                    variant: "destructive",
                });
                return;
            }

            setIsGenerating(true);
            try {
                // Determine appropriate filename based on directory type
                let newFileName = 'new-file.md';
                if (path.includes('commands')) {
                    newFileName = 'my-command.md';
                } else if (path.includes('agents')) {
                    newFileName = 'my-agent.md';
                } else if (path.includes('rules')) {
                    newFileName = 'my-rule.md';
                } else if (path.includes('skills')) {
                    newFileName = 'SKILL.md';
                }

                const newFilePath = `${path}${path.endsWith('/') || path.endsWith('\\') ? '' : '/'}${newFileName}`;
                const generated = await generateFullConfigFile(apiKey, newFileName, newFilePath, "A software project", codingModel);
                await saveConfigFile(newFilePath, generated);

                // Refresh directory listing
                const entries = await listDirectory(path);
                setDirEntries(entries);
                await initialize(); // Refresh tree

                toast({
                    title: "File created",
                    description: `Successfully created ${newFileName}`,
                });

                // Open the new file
                setSelectedFilePath(newFilePath);
            } catch (err) {
                toast({
                    title: "Creation failed",
                    description: (err as any).toString(),
                    variant: "destructive",
                });
            } finally {
                setIsGenerating(false);
            }
        };

        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-12 border-b flex items-center justify-between px-4 bg-muted/40 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{dirName}</span>
                        <span className="text-xs text-muted-foreground">({dirEntries.length} items)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                                setIsLoading(true);
                                const entries = await listDirectory(path);
                                setDirEntries(entries);
                                setIsLoading(false);
                            }}
                            disabled={isLoading}
                            className="h-8 text-[11px] gap-1.5"
                        >
                            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                            Refresh
                        </Button>
                        {apiKey && (
                            <Button
                                size="sm"
                                onClick={handleCreateNewFile}
                                disabled={isGenerating}
                                className="h-8 text-[11px] gap-1.5"
                            >
                                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                New File
                            </Button>
                        )}
                    </div>
                </header>

                <ScrollArea className="flex-1">
                    {dirEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                                <FolderTree className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-sm font-medium mb-1">Empty Directory</h3>
                            <p className="text-xs text-muted-foreground mb-4">
                                No files in this directory yet.
                            </p>
                            {apiKey && (
                                <Button size="sm" onClick={handleCreateNewFile} disabled={isGenerating} className="gap-1.5">
                                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Generate with AI
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 space-y-1">
                            {dirEntries.map((entry) => (
                                <div
                                    key={entry.path}
                                    className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    {entry.is_dir ? (
                                        <Folder className="w-4 h-4 text-primary shrink-0" />
                                    ) : (
                                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                    )}
                                    <button
                                        className="flex-1 text-left text-sm truncate hover:text-primary transition-colors"
                                        onClick={() => setSelectedFilePath(entry.path)}
                                    >
                                        {entry.name}
                                    </button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteEntry(entry);
                                        }}
                                        disabled={isDeleting === entry.path}
                                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                                    >
                                        {isDeleting === entry.path ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3 h-3" />
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        );
    }

    if (!exists) {
        // For paths that should be directories (skills, agents, commands), show specialized view
        // The specialized views will handle creating the directory when they detect it doesn't exist
        const dirName = path.split(/[/\\]/).pop() || '';

        if (dirName === 'skills' || path.endsWith('/skills') || path.endsWith('\\skills')) {
            return <SkillDirectoryView path={path} />;
        }

        if (dirName === 'agents' || path.endsWith('/agents') || path.endsWith('\\agents')) {
            return <AgentDirectoryView path={path} />;
        }

        if (dirName === 'commands' || path.endsWith('/commands') || path.endsWith('\\commands')) {
            return <CommandDirectoryView path={path} />;
        }

        if (dirName === 'rules' || path.endsWith('/rules') || path.endsWith('\\rules')) {
            return <RulesDirectoryView path={path} />;
        }

        // Enterprise files that don't exist - just show info, no create options
        if (isReadOnly) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-6">
                        <Building2 className="w-10 h-10 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight mb-2">Enterprise Configuration</h2>
                    <p className="text-sm text-muted-foreground max-w-md mb-4">
                        This enterprise configuration file does not exist on your system.
                    </p>
                    <code className="px-3 py-2 bg-muted rounded font-mono text-xs mb-6">{path}</code>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                        <Lock className="w-4 h-4" />
                        <span>Enterprise files are managed by your IT administrator</span>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
                <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mb-6">
                    <FileQuestion className="w-10 h-10 text-orange-500" />
                </div>
                <h2 className="text-xl font-bold tracking-tight mb-2">File Not Found</h2>
                <p className="text-sm text-muted-foreground max-w-md mb-8">
                    The configuration file at <code className="px-1.5 py-0.5 bg-muted rounded font-mono text-xs">{path}</code> does not exist yet.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                    <Button
                        variant="outline"
                        onClick={handleCreateEmpty}
                        disabled={isSaving || isGenerating}
                        className="h-24 flex-col gap-2 hover:bg-accent/50 group"
                    >
                        <Plus className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <div className="text-left w-full">
                            <p className="text-sm font-semibold">Create Empty</p>
                            <p className="text-[10px] text-muted-foreground font-normal">Start from scratch</p>
                        </div>
                    </Button>
                    <Button
                        onClick={handleGenerateAI}
                        disabled={isSaving || isGenerating || !apiKey}
                        className="h-24 flex-col gap-2 relative overflow-hidden group shadow-lg shadow-primary/20"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <Sparkles className="w-6 h-6 text-primary-foreground" />
                        )}
                        <div className="text-left w-full">
                            <p className="text-sm font-semibold">Generate with AI</p>
                            <p className="text-[10px] text-primary-foreground/70 font-normal">Use Claude to build it</p>
                        </div>
                        {!apiKey && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center p-2">
                                <p className="text-[10px] font-medium text-destructive">API Key Required</p>
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    const isMarkdown = language === 'markdown';
    const isJson = language === 'json';
    const isIgnore = path.endsWith('.claudeignore');
    const isMcpConfig = path.endsWith('.claude.json') || path.endsWith('.mcp.json') || path.endsWith('managed-mcp.json');

    const renderEditor = () => {
        if (isMarkdown) {
            return (
                <MarkdownEditor
                    value={content}
                    onChange={(val) => setContent(val || '')}
                    view={viewMode as any}
                />
            );
        }

        if (isMcpConfig) {
            return (
                <MCPServerEditor
                    value={content}
                    onChange={(val) => setContent(val || '')}
                    view={viewMode === 'json' ? 'json' : 'form'}
                />
            );
        }

        if (isJson) {
            return (
                <SettingsForm
                    value={content}
                    onChange={(val) => setContent(val || '')}
                    view={viewMode === 'json' ? 'json' : 'form'}
                />
            );
        }

        if (isIgnore) {
            return (
                <IgnoreEditor
                    value={content}
                    onChange={(val) => setContent(val || '')}
                    view={viewMode === 'code' ? 'code' : 'visual'}
                />
            );
        }

        return (
            <MonacoEditor
                language={language}
                value={content}
                onChange={(val) => setContent(val || '')}
            />
        );
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden w-full max-w-full">
            <header className="h-12 border-b flex items-center justify-between px-4 bg-muted/40 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 max-w-[40%]">
                        <FileCode className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-mono text-muted-foreground truncate">{path}</span>
                    </div>

                    <div className="flex-1 flex justify-center">
                        {isMcpConfig && (
                            <Tabs value={viewMode === 'json' ? 'json' : 'form'} onValueChange={setViewMode} className="w-[180px]">
                                <TabsList className="grid w-full grid-cols-2 h-7 p-0.5">
                                    <TabsTrigger value="form" className="text-[10px] h-6 gap-1.5 focus-visible:ring-0">
                                        <Plug className="w-3 h-3" />
                                        Servers
                                    </TabsTrigger>
                                    <TabsTrigger value="json" className="text-[10px] h-6 gap-1.5 focus-visible:ring-0">
                                        <Code className="w-3 h-3" />
                                        Raw JSON
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                        {isJson && !isMcpConfig && (
                            <Tabs value={viewMode === 'json' ? 'json' : 'form'} onValueChange={setViewMode} className="w-[180px]">
                                <TabsList className="grid w-full grid-cols-2 h-7 p-0.5">
                                    <TabsTrigger value="form" className="text-[10px] h-6 gap-1.5 focus-visible:ring-0">
                                        <Settings2 className="w-3 h-3" />
                                        Settings
                                    </TabsTrigger>
                                    <TabsTrigger value="json" className="text-[10px] h-6 gap-1.5 focus-visible:ring-0">
                                        <Code className="w-3 h-3" />
                                        Raw JSON
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                        {isMarkdown && (
                            <Tabs value={['edit', 'split', 'preview'].includes(viewMode) ? viewMode : 'split'} onValueChange={setViewMode} className="w-[240px]">
                                <TabsList className="grid w-full grid-cols-3 h-7 p-0.5">
                                    <TabsTrigger value="edit" className="text-[10px] h-6 gap-1.5">
                                        <Code className="w-3 h-3" />
                                        Edit
                                    </TabsTrigger>
                                    <TabsTrigger value="split" className="text-[10px] h-6 gap-1.5">
                                        <Columns className="w-3 h-3" />
                                        Split
                                    </TabsTrigger>
                                    <TabsTrigger value="preview" className="text-[10px] h-6 gap-1.5">
                                        <Eye className="w-3 h-3" />
                                        Preview
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                        {isIgnore && (
                            <Tabs value={viewMode === 'code' ? 'code' : 'visual'} onValueChange={setViewMode} className="w-[180px]">
                                <TabsList className="grid w-full grid-cols-2 h-7 p-0.5">
                                    <TabsTrigger value="visual" className="text-[10px] h-6 gap-1.5">
                                        <Eye className="w-3 h-3" />
                                        Visual
                                    </TabsTrigger>
                                    <TabsTrigger value="code" className="text-[10px] h-6 gap-1.5">
                                        <Code className="w-3 h-3" />
                                        Code
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 border-l pl-4 ml-4">
                    {!validation.valid && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md" title={validation.issues.join(', ')}>
                            <AlertTriangle className="w-3 h-3" />
                            <span>Issues detected</span>
                        </div>
                    )}
                    {isReadOnly && (
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md">
                            <Lock className="w-3 h-3" />
                            <span>Read-only</span>
                        </div>
                    )}
                    {!isReadOnly && apiKey && !validation.valid && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRegenerate}
                            disabled={isLoading || isSaving || isGenerating}
                            className="h-8 text-[11px] gap-1.5 hover:bg-amber-500/10 text-amber-600"
                        >
                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                            Regenerate
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setIsLoading(true);
                            readConfigFile(path).then(setContent).finally(() => setIsLoading(false));
                        }}
                        disabled={isLoading || isSaving}
                        className="h-8 text-[11px] gap-1.5 hover:bg-muted"
                    >
                        <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                        Reload
                    </Button>
                    {!isReadOnly && (
                        <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 text-[11px] gap-1.5 shadow-sm">
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Save
                        </Button>
                    )}
                </div>
            </header>
            <div className="flex-1 bg-background relative overflow-hidden">
                {renderEditor()}
            </div>
        </div>
    );
}
