import { useState, useEffect } from 'react';
import { listDirectory, deletePath, readConfigFile, saveConfigFile, DirectoryEntry, createDirectory } from '@/lib/paths';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Loader2, Plus, RefreshCw, Trash2,
    Pencil, Sparkles, ScrollText, FolderOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfigStore } from '@/stores/configStore';
import { cn } from '@/lib/utils';
import { generateFullConfigFile } from '@/lib/ai/generators';

interface RuleInfo {
    entry: DirectoryEntry;
    content: string;
    hasPathTargeting: boolean;
    targetPaths: string[];
    preview: string;
}

interface RulesDirectoryViewProps {
    path: string;
}

// Parse path targeting from YAML frontmatter
function parsePathTargeting(content: string): { hasPathTargeting: boolean; targetPaths: string[]; preview: string } {
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

    if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const body = frontmatterMatch[2];

        // Simple YAML parsing for paths array
        const pathsMatch = frontmatter.match(/paths:\s*\n((?:\s*-\s*.+\n?)*)/);
        if (pathsMatch) {
            const pathLines = pathsMatch[1].match(/-\s*(.+)/g) || [];
            const paths = pathLines.map(line => line.replace(/^\s*-\s*/, '').trim());
            return {
                hasPathTargeting: true,
                targetPaths: paths,
                preview: body.trim().slice(0, 200)
            };
        }
        return {
            hasPathTargeting: false,
            targetPaths: [],
            preview: body.trim().slice(0, 200)
        };
    }

    return {
        hasPathTargeting: false,
        targetPaths: [],
        preview: content.trim().slice(0, 200)
    };
}

export function RulesDirectoryView({ path }: RulesDirectoryViewProps) {
    const [rules, setRules] = useState<RuleInfo[]>([]);
    const [subdirs, setSubdirs] = useState<DirectoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createMode, setCreateMode] = useState<'manual' | 'ai'>('manual');

    // Form state for manual creation
    const [newRule, setNewRule] = useState({
        name: '',
        targetPaths: '',
        content: ''
    });

    const { toast } = useToast();
    const { apiKey, codingModel, initialize, setSelectedFilePath } = useConfigStore();

    const loadRules = async () => {
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

            const ruleInfos: RuleInfo[] = [];
            const subDirectories: DirectoryEntry[] = [];

            for (const entry of entries) {
                if (entry.is_dir) {
                    subDirectories.push(entry);
                    continue;
                }

                if (!entry.name.endsWith('.md')) {
                    continue;
                }

                try {
                    const content = await readConfigFile(entry.path);
                    const { hasPathTargeting, targetPaths, preview } = parsePathTargeting(content);

                    ruleInfos.push({
                        entry,
                        content,
                        hasPathTargeting,
                        targetPaths,
                        preview
                    });
                } catch {
                    ruleInfos.push({
                        entry,
                        content: '',
                        hasPathTargeting: false,
                        targetPaths: [],
                        preview: 'Failed to read file'
                    });
                }
            }

            setRules(ruleInfos);
            setSubdirs(subDirectories);
        } catch (err) {
            toast({
                title: "Failed to load rules",
                description: (err as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRules();
    }, [path]);

    const handleDelete = async (rule: RuleInfo) => {
        setIsDeleting(rule.entry.path);
        try {
            await deletePath(rule.entry.path);
            await loadRules();
            await initialize();
            toast({
                title: "Rule deleted",
                description: `Successfully deleted ${rule.entry.name}`,
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
        if (!newRule.name) {
            toast({
                title: "Missing required fields",
                description: "Name is required",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        try {
            const fileName = newRule.name.endsWith('.md') ? newRule.name : `${newRule.name}.md`;
            const filePath = `${path}/${fileName}`;

            let content = '';

            // Add path targeting frontmatter if specified
            if (newRule.targetPaths.trim()) {
                const paths = newRule.targetPaths.split('\n').filter(p => p.trim());
                content = `---\npaths:\n${paths.map(p => `  - ${p.trim()}`).join('\n')}\n---\n\n`;
            }

            content += newRule.content || `# ${newRule.name.replace('.md', '')}\n\nAdd your rule content here.`;

            await saveConfigFile(filePath, content);
            await loadRules();
            await initialize();

            setShowCreateDialog(false);
            setNewRule({ name: '', targetPaths: '', content: '' });

            toast({
                title: "Rule created",
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

        if (!newRule.name) {
            toast({
                title: "Name required",
                description: "Please provide a rule name",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        try {
            const fileName = newRule.name.endsWith('.md') ? newRule.name : `${newRule.name}.md`;
            const filePath = `${path}/${fileName}`;
            const contextHint = newRule.content
                ? `Create a rule about: ${newRule.content}`
                : `A project rule file for ${newRule.name.replace('.md', '')}`;

            const generated = await generateFullConfigFile(apiKey, 'rule.md', filePath, contextHint, codingModel);
            await saveConfigFile(filePath, generated);
            await loadRules();
            await initialize();

            setShowCreateDialog(false);
            setNewRule({ name: '', targetPaths: '', content: '' });

            toast({
                title: "Rule created",
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

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-12 border-b flex items-center justify-between px-4 bg-muted/40 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Rules</span>
                    <span className="text-xs text-muted-foreground">
                        ({rules.length} rule{rules.length !== 1 ? 's' : ''}{subdirs.length > 0 ? `, ${subdirs.length} folder${subdirs.length !== 1 ? 's' : ''}` : ''})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadRules}
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
                        New Rule
                    </Button>
                </div>
            </header>

            {/* Content */}
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : rules.length === 0 && subdirs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                            <ScrollText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">No Rules</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                            Create modular rules for code style, testing, security, and more
                        </p>
                        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                            <Plus className="w-3 h-3" />
                            Create Rule
                        </Button>
                    </div>
                ) : (
                    <div className="p-4 space-y-6">
                        {/* Info Box */}
                        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-muted-foreground">
                            <p className="flex items-start gap-2">
                                <ScrollText className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                                <span>
                                    Rules are modular markdown files that define guidelines. Use YAML frontmatter with <code className="bg-muted px-1 rounded">paths:</code> to target specific directories.
                                </span>
                            </p>
                        </div>

                        {/* Subdirectories */}
                        {subdirs.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                                    Subdirectories
                                </h3>
                                <div className="space-y-1">
                                    {subdirs.map((dir) => (
                                        <div
                                            key={dir.path}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors group cursor-pointer"
                                            onClick={() => setSelectedFilePath(dir.path)}
                                        >
                                            <FolderOpen className="w-4 h-4 text-muted-foreground" />
                                            <span className="flex-1 text-sm truncate">{dir.name}/</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rules */}
                        {rules.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                                    Rule Files
                                </h3>
                                <div className="grid gap-3">
                                    {rules.map((rule) => (
                                        <RuleCard
                                            key={rule.entry.path}
                                            rule={rule}
                                            onDelete={() => handleDelete(rule)}
                                            onEdit={() => setSelectedFilePath(rule.entry.path)}
                                            isDeleting={isDeleting === rule.entry.path}
                                        />
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
                        <DialogTitle>Create New Rule</DialogTitle>
                        <DialogDescription>
                            Define a modular rule for code style, testing, security, or other guidelines
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
                            <Label htmlFor="name">File Name *</Label>
                            <Input
                                id="name"
                                placeholder="code-style.md"
                                value={newRule.name}
                                onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Common names: code-style.md, testing.md, security.md, api.md
                            </p>
                        </div>

                        {createMode === 'manual' && (
                            <>
                                {/* Path Targeting */}
                                <div className="grid gap-2">
                                    <Label htmlFor="paths">Path Targeting (optional)</Label>
                                    <Textarea
                                        id="paths"
                                        placeholder="src/auth/**/*&#10;src/payments/**/*"
                                        value={newRule.targetPaths}
                                        onChange={(e) => setNewRule(prev => ({ ...prev, targetPaths: e.target.value }))}
                                        rows={2}
                                        className="font-mono text-xs"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        One path pattern per line. Rule only applies when working in matching paths.
                                    </p>
                                </div>

                                {/* Content */}
                                <div className="grid gap-2">
                                    <Label htmlFor="content">Rule Content</Label>
                                    <Textarea
                                        id="content"
                                        placeholder="# Code Style Rules&#10;&#10;- Use consistent indentation&#10;- ..."
                                        value={newRule.content}
                                        onChange={(e) => setNewRule(prev => ({ ...prev, content: e.target.value }))}
                                        rows={6}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </>
                        )}

                        {createMode === 'ai' && (
                            <div className="grid gap-2">
                                <Label htmlFor="hint">Description (hint for AI)</Label>
                                <Textarea
                                    id="hint"
                                    placeholder="Rules for writing secure authentication code..."
                                    value={newRule.content}
                                    onChange={(e) => setNewRule(prev => ({ ...prev, content: e.target.value }))}
                                    rows={3}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={createMode === 'manual' ? handleCreateManual : handleCreateWithAI}
                            disabled={isCreating || !newRule.name}
                        >
                            {isCreating ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : createMode === 'ai' ? (
                                <Sparkles className="w-4 h-4 mr-2" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            {createMode === 'ai' ? 'Generate Rule' : 'Create Rule'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Rule Card Component
function RuleCard({
    rule,
    onDelete,
    onEdit,
    isDeleting
}: {
    rule: RuleInfo;
    onDelete: () => void;
    onEdit: () => void;
    isDeleting: boolean;
}) {
    const name = rule.entry.name.replace('.md', '');

    return (
        <div className="group border rounded-lg p-4 bg-card hover:bg-accent/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <ScrollText className="w-4 h-4 text-primary shrink-0" />
                        <h4 className="font-medium text-sm truncate">{name}</h4>
                        {rule.hasPathTargeting && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-600 rounded">
                                path-targeted
                            </span>
                        )}
                    </div>
                    {rule.hasPathTargeting && rule.targetPaths.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mb-2 font-mono">
                            {rule.targetPaths.slice(0, 2).join(', ')}
                            {rule.targetPaths.length > 2 && ` +${rule.targetPaths.length - 2} more`}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {rule.preview || 'No content preview available'}
                    </p>
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
