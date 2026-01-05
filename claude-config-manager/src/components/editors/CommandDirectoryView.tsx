import { useState, useEffect } from 'react';
import { listDirectory, deletePath, readConfigFile, saveConfigFile, DirectoryEntry, createDirectory } from '@/lib/paths';
import { parseFrontmatter, validateCommandFrontmatter, generateFrontmatter, CommandFrontmatter } from '@/lib/frontmatter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToolSelector } from '@/components/ui/tool-selector';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Loader2, Plus, RefreshCw, Trash2, AlertTriangle,
    Terminal, Wrench, FileText, Pencil, Sparkles, Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfigStore } from '@/stores/configStore';
import { cn } from '@/lib/utils';
import { generateFullConfigFile } from '@/lib/ai/generators';

interface CommandInfo {
    entry: DirectoryEntry;
    frontmatter: CommandFrontmatter | null;
    content: string;
    isValid: boolean;
    errors: string[];
}

interface CommandDirectoryViewProps {
    path: string;
}

export function CommandDirectoryView({ path }: CommandDirectoryViewProps) {
    const [commands, setCommands] = useState<CommandInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createMode, setCreateMode] = useState<'manual' | 'ai'>('manual');

    // Form state for manual creation
    const [newCommand, setNewCommand] = useState({
        name: '',
        description: '',
        allowedTools: '',
        argumentHint: '',
        instructions: ''
    });

    const { toast } = useToast();
    const { apiKey, codingModel, initialize, setSelectedFilePath } = useConfigStore();

    const loadCommands = async () => {
        setIsLoading(true);
        try {
            let entries: DirectoryEntry[];
            try {
                entries = await listDirectory(path);
            } catch {
                // Directory doesn't exist, create it
                await createDirectory(path);
                await initialize();
                entries = [];
            }
            const commandInfos: CommandInfo[] = [];

            for (const entry of entries) {
                if (entry.is_dir || !entry.name.endsWith('.md')) {
                    commandInfos.push({
                        entry,
                        frontmatter: null,
                        content: '',
                        isValid: false,
                        errors: entry.is_dir ? [] : ['Not a markdown file']
                    });
                    continue;
                }

                try {
                    const content = await readConfigFile(entry.path);
                    const parsed = parseFrontmatter<CommandFrontmatter>(content);
                    const validationErrors = validateCommandFrontmatter(parsed.frontmatter);

                    commandInfos.push({
                        entry,
                        frontmatter: parsed.frontmatter,
                        content: parsed.content,
                        isValid: parsed.isValid && validationErrors.length === 0,
                        errors: [...parsed.errors, ...validationErrors]
                    });
                } catch (err) {
                    commandInfos.push({
                        entry,
                        frontmatter: null,
                        content: '',
                        isValid: false,
                        errors: ['Failed to read file']
                    });
                }
            }

            setCommands(commandInfos);
        } catch (err) {
            toast({
                title: "Failed to load commands",
                description: (err as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCommands();
    }, [path]);

    const handleDelete = async (command: CommandInfo) => {
        setIsDeleting(command.entry.path);
        try {
            await deletePath(command.entry.path);
            await loadCommands();
            await initialize();
            toast({
                title: "Command deleted",
                description: `Successfully deleted ${command.entry.name}`,
            });
        } catch (err) {
            toast({
                title: "Delete failed",
                description: (err as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(null);
        }
    };

    const handleCreateManual = async () => {
        if (!newCommand.name || !newCommand.description) {
            toast({
                title: "Missing required fields",
                description: "Name and description are required",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        try {
            const frontmatterData: Record<string, string> = {
                description: newCommand.description,
            };
            if (newCommand.allowedTools) {
                frontmatterData['allowed-tools'] = newCommand.allowedTools;
            }
            if (newCommand.argumentHint) {
                frontmatterData['argument-hint'] = newCommand.argumentHint;
            }

            const frontmatter = generateFrontmatter(frontmatterData);
            const content = `${frontmatter}\n\n${newCommand.instructions || 'Your command instructions go here.\n\nUse $ARGUMENTS to access any arguments passed to the command.'}`;
            const fileName = `${newCommand.name}.md`;
            const filePath = `${path}/${fileName}`;

            await saveConfigFile(filePath, content);
            await loadCommands();
            await initialize();

            setShowCreateDialog(false);
            setNewCommand({ name: '', description: '', allowedTools: '', argumentHint: '', instructions: '' });

            toast({
                title: "Command created",
                description: `Successfully created ${fileName}`,
            });
        } catch (err) {
            toast({
                title: "Creation failed",
                description: (err as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateWithAI = async () => {
        if (!apiKey) {
            toast({
                title: "API Key Required",
                description: "Please configure your Anthropic API key in settings.",
                variant: "destructive",
            });
            return;
        }

        if (!newCommand.name) {
            toast({
                title: "Name required",
                description: "Please provide a command name",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        try {
            const fileName = `${newCommand.name}.md`;
            const filePath = `${path}/${fileName}`;

            const contextHint = newCommand.description
                ? `Create a slash command for: ${newCommand.description}`
                : 'A useful development slash command';

            const generated = await generateFullConfigFile(apiKey, fileName, filePath, contextHint, codingModel);
            await saveConfigFile(filePath, generated);
            await loadCommands();
            await initialize();

            setShowCreateDialog(false);
            setNewCommand({ name: '', description: '', allowedTools: '', argumentHint: '', instructions: '' });

            toast({
                title: "Command created",
                description: `Successfully generated ${fileName}`,
            });
        } catch (err) {
            toast({
                title: "Generation failed",
                description: (err as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const validCommands = commands.filter(c => c.frontmatter && c.isValid);
    const invalidCommands = commands.filter(c => !c.isValid && c.entry.name.endsWith('.md'));
    const otherFiles = commands.filter(c => !c.entry.name.endsWith('.md'));

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-12 border-b flex items-center justify-between px-4 bg-muted/40 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Commands</span>
                    <span className="text-xs text-muted-foreground">
                        ({validCommands.length} valid{invalidCommands.length > 0 ? `, ${invalidCommands.length} invalid` : ''})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadCommands}
                        disabled={isLoading}
                        className="h-8 text-[11px] gap-1.5"
                    >
                        <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setShowCreateDialog(true)}
                        className="h-8 text-[11px] gap-1.5"
                    >
                        <Plus className="w-3 h-3" />
                        New Command
                    </Button>
                </div>
            </header>

            {/* Content */}
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : commands.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                            <Terminal className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">No Commands</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                            Create custom slash commands to automate workflows
                        </p>
                        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                            <Plus className="w-3 h-3" />
                            Create Command
                        </Button>
                    </div>
                ) : (
                    <div className="p-4 space-y-6">
                        {/* Valid Commands */}
                        {validCommands.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                                    Configured Commands
                                </h3>
                                <div className="grid gap-3">
                                    {validCommands.map((command) => (
                                        <CommandCard
                                            key={command.entry.path}
                                            command={command}
                                            onDelete={() => handleDelete(command)}
                                            onEdit={() => setSelectedFilePath(command.entry.path)}
                                            isDeleting={isDeleting === command.entry.path}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Invalid Commands */}
                        {invalidCommands.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-medium text-amber-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3 h-3" />
                                    Invalid Commands
                                </h3>
                                <div className="grid gap-3">
                                    {invalidCommands.map((command) => (
                                        <InvalidCommandCard
                                            key={command.entry.path}
                                            command={command}
                                            onDelete={() => handleDelete(command)}
                                            onEdit={() => setSelectedFilePath(command.entry.path)}
                                            isDeleting={isDeleting === command.entry.path}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Other Files */}
                        {otherFiles.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                                    Other Files
                                </h3>
                                <div className="space-y-1">
                                    {otherFiles.map((file) => (
                                        <div
                                            key={file.entry.path}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors group"
                                        >
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            <button
                                                className="flex-1 text-left text-sm truncate hover:text-primary"
                                                onClick={() => setSelectedFilePath(file.entry.path)}
                                            >
                                                {file.entry.name}
                                            </button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(file)}
                                                disabled={isDeleting === file.entry.path}
                                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                                            >
                                                {isDeleting === file.entry.path ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3 h-3" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New Command</DialogTitle>
                        <DialogDescription>
                            Define a custom slash command for Claude Code
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Creation Mode Toggle */}
                        <div className="flex gap-2">
                            <Button
                                variant={createMode === 'manual' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCreateMode('manual')}
                                className="flex-1 gap-1.5"
                            >
                                <Pencil className="w-3 h-3" />
                                Manual
                            </Button>
                            <Button
                                variant={createMode === 'ai' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCreateMode('ai')}
                                disabled={!apiKey}
                                className="flex-1 gap-1.5"
                            >
                                <Sparkles className="w-3 h-3" />
                                AI Assisted
                            </Button>
                        </div>

                        {/* Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">Command Name *</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">/</span>
                                <Input
                                    id="name"
                                    placeholder="my-command"
                                    value={newCommand.name}
                                    onChange={(e) => setNewCommand(prev => ({
                                        ...prev,
                                        name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                                    }))}
                                    className="flex-1"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Will be invoked as /{newCommand.name || 'command-name'}
                            </p>
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">
                                Description *
                                {createMode === 'ai' && <span className="text-muted-foreground font-normal"> (used as hint for AI)</span>}
                            </Label>
                            <Input
                                id="description"
                                placeholder="Creates a git commit with a descriptive message"
                                value={newCommand.description}
                                onChange={(e) => setNewCommand(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        {createMode === 'manual' && (
                            <>
                                {/* Allowed Tools */}
                                <div className="grid gap-2">
                                    <Label>Allowed Tools (optional)</Label>
                                    <ToolSelector
                                        value={newCommand.allowedTools}
                                        onChange={(tools) => setNewCommand(prev => ({ ...prev, allowedTools: tools }))}
                                        placeholder="Select tools this command can use"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Restrict which tools this command can access
                                    </p>
                                </div>

                                {/* Argument Hint */}
                                <div className="grid gap-2">
                                    <Label htmlFor="argHint">Argument Hint (optional)</Label>
                                    <Input
                                        id="argHint"
                                        placeholder="<commit-message>"
                                        value={newCommand.argumentHint}
                                        onChange={(e) => setNewCommand(prev => ({ ...prev, argumentHint: e.target.value }))}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Shown to user as: /{newCommand.name || 'command'} {newCommand.argumentHint || '<args>'}
                                    </p>
                                </div>

                                {/* Instructions */}
                                <div className="grid gap-2">
                                    <Label htmlFor="instructions">Instructions</Label>
                                    <Textarea
                                        id="instructions"
                                        placeholder="Create a git commit with the provided message: $ARGUMENTS&#10;&#10;If no message is provided, analyze the changes and suggest an appropriate commit message."
                                        value={newCommand.instructions}
                                        onChange={(e) => setNewCommand(prev => ({ ...prev, instructions: e.target.value }))}
                                        rows={4}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Use $ARGUMENTS to access command arguments
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={createMode === 'manual' ? handleCreateManual : handleCreateWithAI}
                            disabled={isCreating || !newCommand.name || (createMode === 'manual' && !newCommand.description)}
                        >
                            {isCreating ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : createMode === 'ai' ? (
                                <Sparkles className="w-4 h-4 mr-2" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            {createMode === 'ai' ? 'Generate Command' : 'Create Command'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Command Card Component
function CommandCard({
    command,
    onDelete,
    onEdit,
    isDeleting
}: {
    command: CommandInfo;
    onDelete: () => void;
    onEdit: () => void;
    isDeleting: boolean;
}) {
    const fm = command.frontmatter!;
    const commandName = command.entry.name.replace('.md', '');

    return (
        <div className="group border rounded-lg p-4 bg-card hover:bg-accent/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-primary shrink-0" />
                        <h4 className="font-medium text-sm font-mono">/{commandName}</h4>
                        {fm['argument-hint'] && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                                {fm['argument-hint']}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {fm.description}
                    </p>
                    {fm['allowed-tools'] && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Wrench className="w-3 h-3" />
                            <span className="truncate">{fm['allowed-tools']}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEdit}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Invalid Command Card
function InvalidCommandCard({
    command,
    onDelete,
    onEdit,
    isDeleting
}: {
    command: CommandInfo;
    onDelete: () => void;
    onEdit: () => void;
    isDeleting: boolean;
}) {
    return (
        <div className="group border border-amber-500/30 rounded-lg p-4 bg-amber-500/5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <h4 className="font-medium text-sm truncate">{command.entry.name}</h4>
                    </div>
                    <div className="text-xs text-amber-600 space-y-0.5">
                        {command.errors.map((err, i) => (
                            <p key={i}>• {err}</p>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEdit}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
