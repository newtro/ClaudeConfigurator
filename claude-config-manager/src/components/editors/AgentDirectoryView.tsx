import { useState, useEffect } from 'react';
import { listDirectory, deletePath, readConfigFile, saveConfigFile, DirectoryEntry, createDirectory } from '@/lib/paths';
import { parseFrontmatter, validateAgentFrontmatter, generateFrontmatter, AgentFrontmatter } from '@/lib/frontmatter';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Loader2, Plus, RefreshCw, Trash2, AlertTriangle,
    Bot, Wrench, FileText, Pencil, Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfigStore } from '@/stores/configStore';
import { cn } from '@/lib/utils';
import { generateFullConfigFile } from '@/lib/ai/generators';

interface AgentInfo {
    entry: DirectoryEntry;
    frontmatter: AgentFrontmatter | null;
    content: string;
    isValid: boolean;
    errors: string[];
}

interface AgentDirectoryViewProps {
    path: string;
}

export function AgentDirectoryView({ path }: AgentDirectoryViewProps) {
    const [agents, setAgents] = useState<AgentInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createMode, setCreateMode] = useState<'manual' | 'ai'>('manual');

    // Form state for manual creation
    const [newAgent, setNewAgent] = useState({
        name: '',
        description: '',
        tools: '',
        model: 'inherit',
        prompt: ''
    });

    const { toast } = useToast();
    const { apiKey, codingModel, initialize, setSelectedFilePath } = useConfigStore();

    const loadAgents = async () => {
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
            const agentInfos: AgentInfo[] = [];

            for (const entry of entries) {
                if (entry.is_dir || !entry.name.endsWith('.md')) {
                    // Skip non-markdown files but still show them
                    agentInfos.push({
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
                    const parsed = parseFrontmatter<AgentFrontmatter>(content);
                    const validationErrors = validateAgentFrontmatter(parsed.frontmatter);

                    agentInfos.push({
                        entry,
                        frontmatter: parsed.frontmatter,
                        content: parsed.content,
                        isValid: parsed.isValid && validationErrors.length === 0,
                        errors: [...parsed.errors, ...validationErrors]
                    });
                } catch (err) {
                    agentInfos.push({
                        entry,
                        frontmatter: null,
                        content: '',
                        isValid: false,
                        errors: ['Failed to read file']
                    });
                }
            }

            setAgents(agentInfos);
        } catch (err) {
            toast({
                title: "Failed to load agents",
                description: (err as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAgents();
    }, [path]);

    const handleDelete = async (agent: AgentInfo) => {
        setIsDeleting(agent.entry.path);
        try {
            await deletePath(agent.entry.path);
            await loadAgents();
            await initialize();
            toast({
                title: "Agent deleted",
                description: `Successfully deleted ${agent.entry.name}`,
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
        if (!newAgent.name || !newAgent.description) {
            toast({
                title: "Missing required fields",
                description: "Name and description are required",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        try {
            const frontmatter = generateFrontmatter({
                name: newAgent.name,
                description: newAgent.description,
                tools: newAgent.tools || undefined,
                model: newAgent.model !== 'inherit' ? newAgent.model : undefined,
            });

            const content = `${frontmatter}\n\n${newAgent.prompt || 'Your agent instructions go here.'}`;
            const fileName = `${newAgent.name}.md`;
            const filePath = `${path}/${fileName}`;

            await saveConfigFile(filePath, content);
            await loadAgents();
            await initialize();

            setShowCreateDialog(false);
            setNewAgent({ name: '', description: '', tools: '', model: 'inherit', prompt: '' });

            toast({
                title: "Agent created",
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

        if (!newAgent.name) {
            toast({
                title: "Name required",
                description: "Please provide an agent name",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        try {
            const fileName = `${newAgent.name}.md`;
            const filePath = `${path}/${fileName}`;

            const contextHint = newAgent.description
                ? `Create an agent for: ${newAgent.description}`
                : 'A general-purpose development assistant';

            const generated = await generateFullConfigFile(apiKey, fileName, filePath, contextHint, codingModel);
            await saveConfigFile(filePath, generated);
            await loadAgents();
            await initialize();

            setShowCreateDialog(false);
            setNewAgent({ name: '', description: '', tools: '', model: 'inherit', prompt: '' });

            toast({
                title: "Agent created",
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

    const validAgents = agents.filter(a => a.frontmatter && a.isValid);
    const invalidAgents = agents.filter(a => !a.isValid && a.entry.name.endsWith('.md'));
    const otherFiles = agents.filter(a => !a.entry.name.endsWith('.md'));

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-12 border-b flex items-center justify-between px-4 bg-muted/40 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Agents</span>
                    <span className="text-xs text-muted-foreground">
                        ({validAgents.length} valid{invalidAgents.length > 0 ? `, ${invalidAgents.length} invalid` : ''})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadAgents}
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
                        New Agent
                    </Button>
                </div>
            </header>

            {/* Content */}
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : agents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                            <Bot className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">No Agents</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                            Create custom agents to automate tasks
                        </p>
                        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                            <Plus className="w-3 h-3" />
                            Create Agent
                        </Button>
                    </div>
                ) : (
                    <div className="p-4 space-y-6">
                        {/* Valid Agents */}
                        {validAgents.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                                    Configured Agents
                                </h3>
                                <div className="grid gap-3">
                                    {validAgents.map((agent) => (
                                        <AgentCard
                                            key={agent.entry.path}
                                            agent={agent}
                                            onDelete={() => handleDelete(agent)}
                                            onEdit={() => setSelectedFilePath(agent.entry.path)}
                                            isDeleting={isDeleting === agent.entry.path}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Invalid Agents */}
                        {invalidAgents.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-medium text-amber-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3 h-3" />
                                    Invalid Agents
                                </h3>
                                <div className="grid gap-3">
                                    {invalidAgents.map((agent) => (
                                        <InvalidAgentCard
                                            key={agent.entry.path}
                                            agent={agent}
                                            onDelete={() => handleDelete(agent)}
                                            onEdit={() => setSelectedFilePath(agent.entry.path)}
                                            isDeleting={isDeleting === agent.entry.path}
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
                        <DialogTitle>Create New Agent</DialogTitle>
                        <DialogDescription>
                            Define a specialized agent with custom tools and instructions
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
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                placeholder="code-reviewer"
                                value={newAgent.name}
                                onChange={(e) => setNewAgent(prev => ({
                                    ...prev,
                                    name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                                }))}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Lowercase letters, numbers, and hyphens only
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
                                placeholder="Reviews code for bugs, security issues, and improvements"
                                value={newAgent.description}
                                onChange={(e) => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        {createMode === 'manual' && (
                            <>
                                {/* Tools */}
                                <div className="grid gap-2">
                                    <Label>Tools (optional)</Label>
                                    <ToolSelector
                                        value={newAgent.tools}
                                        onChange={(tools) => setNewAgent(prev => ({ ...prev, tools }))}
                                        placeholder="Leave empty to inherit all tools"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Select specific tools or leave empty to inherit all.
                                    </p>
                                </div>

                                {/* Model */}
                                <div className="grid gap-2">
                                    <Label>Model</Label>
                                    <Select
                                        value={newAgent.model}
                                        onValueChange={(v) => setNewAgent(prev => ({ ...prev, model: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="inherit">Inherit from parent</SelectItem>
                                            <SelectItem value="sonnet">Sonnet (balanced)</SelectItem>
                                            <SelectItem value="opus">Opus (most capable)</SelectItem>
                                            <SelectItem value="haiku">Haiku (fastest)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* System Prompt */}
                                <div className="grid gap-2">
                                    <Label htmlFor="prompt">System Prompt</Label>
                                    <Textarea
                                        id="prompt"
                                        placeholder="You are an expert code reviewer. When invoked, analyze the code for..."
                                        value={newAgent.prompt}
                                        onChange={(e) => setNewAgent(prev => ({ ...prev, prompt: e.target.value }))}
                                        rows={4}
                                    />
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
                            disabled={isCreating || !newAgent.name || (createMode === 'manual' && !newAgent.description)}
                        >
                            {isCreating ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : createMode === 'ai' ? (
                                <Sparkles className="w-4 h-4 mr-2" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            {createMode === 'ai' ? 'Generate Agent' : 'Create Agent'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Agent Card Component
function AgentCard({
    agent,
    onDelete,
    onEdit,
    isDeleting
}: {
    agent: AgentInfo;
    onDelete: () => void;
    onEdit: () => void;
    isDeleting: boolean;
}) {
    const fm = agent.frontmatter!;

    return (
        <div className="group border rounded-lg p-4 bg-card hover:bg-accent/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Bot className="w-4 h-4 text-primary shrink-0" />
                        <h4 className="font-medium text-sm truncate">{fm.name}</h4>
                        {fm.model && fm.model !== 'inherit' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                {fm.model}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {fm.description}
                    </p>
                    {fm.tools && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Wrench className="w-3 h-3" />
                            <span className="truncate">{fm.tools}</span>
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

// Invalid Agent Card
function InvalidAgentCard({
    agent,
    onDelete,
    onEdit,
    isDeleting
}: {
    agent: AgentInfo;
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
                        <h4 className="font-medium text-sm truncate">{agent.entry.name}</h4>
                    </div>
                    <div className="text-xs text-amber-600 space-y-0.5">
                        {agent.errors.map((err, i) => (
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
