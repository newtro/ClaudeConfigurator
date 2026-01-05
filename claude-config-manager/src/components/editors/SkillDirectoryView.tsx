import { useState, useEffect } from 'react';
import { listDirectory, deletePath, readConfigFile, saveConfigFile, DirectoryEntry, createDirectory } from '@/lib/paths';
import { parseFrontmatter, validateSkillFrontmatter, generateFrontmatter, SkillFrontmatter } from '@/lib/frontmatter';
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
    Sparkles, Wrench, FileText, Pencil, FolderOpen, Zap, Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfigStore } from '@/stores/configStore';
import { cn } from '@/lib/utils';
import { generateFullConfigFile } from '@/lib/ai/generators';
import { SkillBrowser } from './SkillBrowser';

interface SkillInfo {
    entry: DirectoryEntry;
    frontmatter: SkillFrontmatter | null;
    content: string;
    skillMdPath: string;
    isValid: boolean;
    errors: string[];
    hasWorkflows: boolean;
    hasContext: boolean;
}

interface SkillDirectoryViewProps {
    path: string;
}

export function SkillDirectoryView({ path }: SkillDirectoryViewProps) {
    const [skills, setSkills] = useState<SkillInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showSkillBrowser, setShowSkillBrowser] = useState(false);
    const [createMode, setCreateMode] = useState<'manual' | 'ai'>('manual');

    // Form state for manual creation
    const [newSkill, setNewSkill] = useState({
        name: '',
        description: '',
        allowedTools: '',
        instructions: ''
    });

    const { toast } = useToast();
    const { apiKey, codingModel, initialize, setSelectedFilePath } = useConfigStore();

    const loadSkills = async () => {
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
            const skillInfos: SkillInfo[] = [];

            for (const entry of entries) {
                // Skills are directories containing SKILL.md
                if (!entry.is_dir) {
                    // Show non-directory files as other files
                    skillInfos.push({
                        entry,
                        frontmatter: null,
                        content: '',
                        skillMdPath: '',
                        isValid: false,
                        errors: ['Not a skill directory'],
                        hasWorkflows: false,
                        hasContext: false
                    });
                    continue;
                }

                // Check for SKILL.md inside the directory
                const skillMdPath = `${entry.path}/SKILL.md`;
                try {
                    const content = await readConfigFile(skillMdPath);
                    const parsed = parseFrontmatter<SkillFrontmatter>(content);
                    const validationErrors = validateSkillFrontmatter(parsed.frontmatter);

                    // Check for workflows/ and context/ subdirectories
                    let hasWorkflows = false;
                    let hasContext = false;
                    try {
                        const subEntries = await listDirectory(entry.path);
                        hasWorkflows = subEntries.some(e => e.is_dir && e.name === 'workflows');
                        hasContext = subEntries.some(e => e.is_dir && e.name === 'context');
                    } catch {
                        // Ignore errors checking subdirectories
                    }

                    skillInfos.push({
                        entry,
                        frontmatter: parsed.frontmatter,
                        content: parsed.content,
                        skillMdPath,
                        isValid: parsed.isValid && validationErrors.length === 0,
                        errors: [...parsed.errors, ...validationErrors],
                        hasWorkflows,
                        hasContext
                    });
                } catch {
                    // Directory exists but no SKILL.md
                    skillInfos.push({
                        entry,
                        frontmatter: null,
                        content: '',
                        skillMdPath,
                        isValid: false,
                        errors: ['Missing SKILL.md file'],
                        hasWorkflows: false,
                        hasContext: false
                    });
                }
            }

            setSkills(skillInfos);
        } catch (err) {
            toast({
                title: "Failed to load skills",
                description: (err as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSkills();
    }, [path]);

    const handleDelete = async (skill: SkillInfo) => {
        setIsDeleting(skill.entry.path);
        try {
            await deletePath(skill.entry.path);
            await loadSkills();
            await initialize();
            toast({
                title: "Skill deleted",
                description: `Successfully deleted ${skill.entry.name}`,
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
        if (!newSkill.name || !newSkill.description) {
            toast({
                title: "Missing required fields",
                description: "Name and description are required",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        try {
            // Create skill directory
            const skillDirPath = `${path}/${newSkill.name}`;
            await createDirectory(skillDirPath);

            // Generate SKILL.md content
            const frontmatter = generateFrontmatter({
                name: newSkill.name,
                description: newSkill.description,
                'allowed-tools': newSkill.allowedTools || undefined,
            });

            const content = `${frontmatter}\n\n${newSkill.instructions || '# ' + newSkill.name + '\n\nAdd your skill instructions here.'}`;
            const skillMdPath = `${skillDirPath}/SKILL.md`;

            await saveConfigFile(skillMdPath, content);
            await loadSkills();
            await initialize();

            setShowCreateDialog(false);
            setNewSkill({ name: '', description: '', allowedTools: '', instructions: '' });

            toast({
                title: "Skill created",
                description: `Successfully created ${newSkill.name}`,
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

        if (!newSkill.name) {
            toast({
                title: "Name required",
                description: "Please provide a skill name",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        try {
            // Create skill directory
            const skillDirPath = `${path}/${newSkill.name}`;
            await createDirectory(skillDirPath);

            const skillMdPath = `${skillDirPath}/SKILL.md`;
            const contextHint = newSkill.description
                ? `Create a skill for: ${newSkill.description}`
                : 'A general-purpose development skill';

            const generated = await generateFullConfigFile(apiKey, 'SKILL.md', skillMdPath, contextHint, codingModel);
            await saveConfigFile(skillMdPath, generated);
            await loadSkills();
            await initialize();

            setShowCreateDialog(false);
            setNewSkill({ name: '', description: '', allowedTools: '', instructions: '' });

            toast({
                title: "Skill created",
                description: `Successfully generated ${newSkill.name}`,
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

    const validSkills = skills.filter(s => s.frontmatter && s.isValid);
    const invalidSkills = skills.filter(s => s.entry.is_dir && !s.isValid);
    const otherFiles = skills.filter(s => !s.entry.is_dir);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-12 border-b flex items-center justify-between px-4 bg-muted/40 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Skills</span>
                    <span className="text-xs text-muted-foreground">
                        ({validSkills.length} valid{invalidSkills.length > 0 ? `, ${invalidSkills.length} invalid` : ''})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadSkills}
                        disabled={isLoading}
                        className="h-8 text-[11px] gap-1.5"
                    >
                        <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSkillBrowser(true)}
                        className="h-8 text-[11px] gap-1.5"
                    >
                        <Search className="w-3 h-3" />
                        Find Skills
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setShowCreateDialog(true)}
                        className="h-8 text-[11px] gap-1.5"
                    >
                        <Plus className="w-3 h-3" />
                        New Skill
                    </Button>
                </div>
            </header>

            {/* Content */}
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : skills.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                            <Zap className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">No Skills</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                            Create skills to add context and capabilities to Claude
                        </p>
                        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                            <Plus className="w-3 h-3" />
                            Create Skill
                        </Button>
                    </div>
                ) : (
                    <div className="p-4 space-y-6">
                        {/* Info Box */}
                        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-muted-foreground">
                            <p className="flex items-start gap-2">
                                <Zap className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                                <span>
                                    Skills are automatically triggered based on their description. Each skill is a folder containing a <code className="bg-muted px-1 rounded">SKILL.md</code> file with instructions for Claude.
                                </span>
                            </p>
                        </div>

                        {/* Valid Skills */}
                        {validSkills.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                                    Configured Skills
                                </h3>
                                <div className="grid gap-3">
                                    {validSkills.map((skill) => (
                                        <SkillCard
                                            key={skill.entry.path}
                                            skill={skill}
                                            onDelete={() => handleDelete(skill)}
                                            onEdit={() => setSelectedFilePath(skill.skillMdPath)}
                                            onOpenFolder={() => setSelectedFilePath(skill.entry.path)}
                                            isDeleting={isDeleting === skill.entry.path}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Invalid Skills */}
                        {invalidSkills.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-medium text-amber-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3 h-3" />
                                    Invalid Skills
                                </h3>
                                <div className="grid gap-3">
                                    {invalidSkills.map((skill) => (
                                        <InvalidSkillCard
                                            key={skill.entry.path}
                                            skill={skill}
                                            onDelete={() => handleDelete(skill)}
                                            onEdit={() => skill.skillMdPath ? setSelectedFilePath(skill.skillMdPath) : setSelectedFilePath(skill.entry.path)}
                                            isDeleting={isDeleting === skill.entry.path}
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
                        <DialogTitle>Create New Skill</DialogTitle>
                        <DialogDescription>
                            Define a skill to add context and capabilities to Claude
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
                                placeholder="processing-pdfs"
                                value={newSkill.name}
                                onChange={(e) => setNewSkill(prev => ({
                                    ...prev,
                                    name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                                }))}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Use gerund form (verb + -ing). Max 64 characters.
                            </p>
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">
                                Description *
                                {createMode === 'ai' && <span className="text-muted-foreground font-normal"> (used as hint for AI)</span>}
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs."
                                value={newSkill.description}
                                onChange={(e) => setNewSkill(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Write in third person. Include what the skill does AND when to use it. Max 1024 characters.
                            </p>
                        </div>

                        {createMode === 'manual' && (
                            <>
                                {/* Allowed Tools */}
                                <div className="grid gap-2">
                                    <Label>Allowed Tools (optional)</Label>
                                    <ToolSelector
                                        value={newSkill.allowedTools}
                                        onChange={(tools) => setNewSkill(prev => ({ ...prev, allowedTools: tools }))}
                                        placeholder="Leave empty to allow all tools"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Restrict which tools this skill can use.
                                    </p>
                                </div>

                                {/* Instructions */}
                                <div className="grid gap-2">
                                    <Label htmlFor="instructions">Instructions</Label>
                                    <Textarea
                                        id="instructions"
                                        placeholder="# Processing PDFs&#10;&#10;When working with PDF files:&#10;1. Use pdfplumber for text extraction&#10;2. ..."
                                        value={newSkill.instructions}
                                        onChange={(e) => setNewSkill(prev => ({ ...prev, instructions: e.target.value }))}
                                        rows={5}
                                        className="font-mono text-xs"
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
                            disabled={isCreating || !newSkill.name || (createMode === 'manual' && !newSkill.description)}
                        >
                            {isCreating ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : createMode === 'ai' ? (
                                <Sparkles className="w-4 h-4 mr-2" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            {createMode === 'ai' ? 'Generate Skill' : 'Create Skill'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Skill Browser Dialog */}
            <SkillBrowser
                open={showSkillBrowser}
                onOpenChange={setShowSkillBrowser}
                skillsPath={path}
                onImported={loadSkills}
            />
        </div>
    );
}

// Skill Card Component
function SkillCard({
    skill,
    onDelete,
    onEdit,
    onOpenFolder,
    isDeleting
}: {
    skill: SkillInfo;
    onDelete: () => void;
    onEdit: () => void;
    onOpenFolder: () => void;
    isDeleting: boolean;
}) {
    const fm = skill.frontmatter!;

    return (
        <div className="group border rounded-lg p-4 bg-card hover:bg-accent/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-primary shrink-0" />
                        <h4 className="font-medium text-sm truncate">{fm.name}</h4>
                        {skill.hasWorkflows && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded">
                                workflows
                            </span>
                        )}
                        {skill.hasContext && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-600 rounded">
                                context
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
                        onClick={onOpenFolder}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        title="Open skill folder"
                    >
                        <FolderOpen className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEdit}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        title="Edit SKILL.md"
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

// Invalid Skill Card
function InvalidSkillCard({
    skill,
    onDelete,
    onEdit,
    isDeleting
}: {
    skill: SkillInfo;
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
                        <h4 className="font-medium text-sm truncate">{skill.entry.name}/</h4>
                    </div>
                    <div className="text-xs text-amber-600 space-y-0.5">
                        {skill.errors.map((err, i) => (
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
