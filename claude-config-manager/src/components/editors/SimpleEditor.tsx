import { useState, useEffect } from 'react';
import { readConfigFile, saveConfigFile, checkFileExists } from '@/lib/paths';
import { generateFullConfigFile } from '@/lib/ai/generators';
import { MonacoEditor } from './MonacoEditor';
import { MarkdownEditor } from './MarkdownEditor';
import { SettingsForm } from './SettingsForm';
import { IgnoreEditor } from './IgnoreEditor';
import { Button } from '@/components/ui/button';
import { Loader2, Save, FileCode, RefreshCw, FileQuestion, Sparkles, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfigStore } from '@/stores/configStore';
import { cn } from '@/lib/utils';

interface SimpleEditorProps {
    path: string;
}

export function SimpleEditor({ path }: SimpleEditorProps) {
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [exists, setExists] = useState<boolean>(true);
    const { toast } = useToast();
    const { apiKey, initialize } = useConfigStore();

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            try {
                const fileExists = await checkFileExists(path);
                setExists(fileExists);

                if (fileExists) {
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
            const generated = await generateFullConfigFile(apiKey, fileName, path);
            await saveConfigFile(path, generated);
            setExists(true);
            setContent(generated);
            await initialize(); // Refresh tree
            toast({
                title: "File generated",
                description: `Successfully generated ${fileName} using AI.`,
            });
        } catch (err) {
            toast({
                title: "Generation failed",
                description: (err as any).toString(),
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

    if (!exists) {
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

    const renderEditor = () => {
        if (language === 'markdown') {
            return (
                <MarkdownEditor
                    value={content}
                    onChange={(val) => setContent(val || '')}
                />
            );
        }

        if (language === 'json') {
            return (
                <SettingsForm
                    value={content}
                    onChange={(val) => setContent(val || '')}
                />
            );
        }

        if (path.endsWith('.claudeignore')) {
            return (
                <IgnoreEditor
                    value={content}
                    onChange={(val) => setContent(val || '')}
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
        <div className="flex-1 flex flex-col overflow-hidden">
            <header className="h-12 border-b flex items-center justify-between px-4 bg-muted/30">
                <div className="flex items-center gap-2 overflow-hidden">
                    <FileCode className="w-4 h-4 text-primary" />
                    <span className="text-xs font-mono text-muted-foreground truncate">{path}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setIsLoading(true);
                            readConfigFile(path).then(setContent).finally(() => setIsLoading(false));
                        }}
                        disabled={isLoading || isSaving}
                        className="h-8 text-[11px] gap-1.5"
                    >
                        <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                        Reload
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 text-[11px] gap-1.5">
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                    </Button>
                </div>
            </header>
            <div className="flex-1 bg-background relative">
                {renderEditor()}
            </div>
        </div>
    );
}
