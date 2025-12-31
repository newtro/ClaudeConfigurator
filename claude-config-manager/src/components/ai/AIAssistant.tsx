import { useState, useRef, useEffect } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sparkles,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    ChevronRight,
    Wand2,
    Loader2,
    Send,
    User,
    Bot,
    MinusCircle,
    Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzeClaudeMd, analyzeSettingsJson, HealthIssue } from '@/lib/ai/healthCheck';
import { readConfigFile, saveConfigFile } from '@/lib/paths';
import { generateClaudeMdSection } from '@/lib/ai/generators';
import { useToast } from '@/hooks/use-toast';
import { getAnthropicClient } from '@/lib/anthropic';
import { Input } from '@/components/ui/input';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function AIAssistant() {
    const { apiKey, selectedFilePath, setSettingsOpen } = useConfigStore();
    const [isScanning, setIsScanning] = useState(false);
    const [suggestions, setSuggestions] = useState<HealthIssue[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const { toast } = useToast();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !apiKey || !selectedFilePath || isThinking) return;

        const userMessage = chatInput.trim();
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatInput('');
        setIsThinking(true);

        try {
            const content = await readConfigFile(selectedFilePath);
            const anthropic = getAnthropicClient(apiKey);

            const prompt = `You are a Claude Code configuration expert.
Current File: ${selectedFilePath}
File Content:
\`\`\`
${content}
\`\`\`

User Question: ${userMessage}

Instructions:
- Answer the user's question about the configuration file.
- Be concise and technical.
- If you suggest changes, provide clear explanation.
- Use markdown for formatting.`;

            const response = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20240620",
                max_tokens: 1000,
                messages: [{ role: "user", content: prompt }],
            });

            const assistantMessage = (response.content[0] as any).text;
            setChatHistory(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
        } catch (err) {
            toast({
                title: "Chat Failed",
                description: (err as any).toString(),
                variant: "destructive",
            });
        } finally {
            setIsThinking(false);
        }
    };

    const applySuggestion = async (issue: HealthIssue) => {
        if (!apiKey || !selectedFilePath) return;

        setIsScanning(true);
        try {
            let currentContent = await readConfigFile(selectedFilePath);
            let newSection = '';

            if (issue.id.startsWith('missing-')) {
                const sectionName = issue.title.replace('Missing ', '').replace(' Section', '');
                newSection = await generateClaudeMdSection(apiKey, sectionName, "Standard Claude configuration");

                const updatedContent = currentContent.trim() + '\n\n' + newSection.trim();
                await saveConfigFile(selectedFilePath, updatedContent);

                toast({
                    title: "Suggestion Applied",
                    description: `Successfully added the ${sectionName} section.`,
                });

                setSuggestions(prev => prev.filter(s => s.id !== issue.id));
            }
        } catch (err) {
            toast({
                title: "Application Failed",
                description: (err as any).toString(),
                variant: "destructive",
            });
        } finally {
            setIsScanning(false);
        }
    };

    const runHealthCheck = async () => {
        if (!apiKey || !selectedFilePath) return;
        setIsScanning(true);

        try {
            const content = await readConfigFile(selectedFilePath);
            let issues: HealthIssue[] = [];

            if (selectedFilePath.endsWith('CLAUDE.md')) {
                issues = analyzeClaudeMd(content, selectedFilePath);
            } else if (selectedFilePath.endsWith('settings.json')) {
                issues = analyzeSettingsJson(content, selectedFilePath);
            }

            setSuggestions(issues);
        } catch (err) {
            console.error('Scan failed:', err);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="w-80 border-l bg-card h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-sm">AI Assistant</h2>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={runHealthCheck}
                    disabled={isScanning || !apiKey || !selectedFilePath}
                >
                    <RefreshCw className={cn("w-4 h-4", isScanning && "animate-spin")} />
                </Button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1" viewportRef={scrollRef}>
                    {!apiKey ? (
                        <div className="p-8 text-center space-y-6">
                            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto">
                                <AlertCircle className="w-7 h-7 text-amber-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold tracking-tight">AI Assistant Locked</h3>
                                <p className="text-[12px] text-muted-foreground leading-relaxed px-2">
                                    Configure your Anthropic API key in settings to enable real-time health checks and smart generations.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                className="w-full text-[11px] h-9"
                                onClick={() => setSettingsOpen(true)}
                            >
                                Configure API Key
                            </Button>
                        </div>
                    ) : !selectedFilePath ? (
                        <div className="p-8 text-center space-y-4">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                                <AlertCircle className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">No File Selected</p>
                                <p className="text-xs text-muted-foreground">
                                    Select a configuration file to analyze it for health issues.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-6">
                            {/* Suggestions Section */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Suggestions</h3>
                                {suggestions.length === 0 && !isScanning && (
                                    <div className="p-3 border border-dashed rounded-lg text-center">
                                        <p className="text-[10px] text-muted-foreground italic">
                                            Everything looks good! No critical issues found.
                                        </p>
                                    </div>
                                )}
                                {suggestions.map((s) => (
                                    <div key={s.id} className="p-3 border rounded-lg bg-muted/20 space-y-3 relative group">
                                        <div className="flex gap-2">
                                            {s.type === 'warning' ? (
                                                <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                            )}
                                            <div className="space-y-0.5">
                                                <p className="text-[11px] font-semibold">{s.title}</p>
                                                <p className="text-[10px] text-muted-foreground leading-tight">
                                                    {s.description}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full text-[10px] h-6 justify-between px-2"
                                            onClick={() => applySuggestion(s)}
                                            disabled={isScanning}
                                        >
                                            <div className="flex items-center gap-1">
                                                {isScanning ? (
                                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                ) : (
                                                    <Wand2 className="w-2.5 h-2.5" />
                                                )}
                                                {s.action}
                                            </div>
                                            <ChevronRight className="w-2.5 h-2.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Chat Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Q&A Chat</h3>
                                    {chatHistory.length > 0 && (
                                        <button
                                            onClick={() => setChatHistory([])}
                                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                        >
                                            <MinusCircle className="w-3 h-3" />
                                            Clear
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {chatHistory.map((msg, i) => (
                                        <div key={i} className={cn(
                                            "flex flex-col gap-1.5",
                                            msg.role === 'user' ? "items-end" : "items-start"
                                        )}>
                                            <div className="flex items-center gap-1.5 px-1">
                                                {msg.role === 'assistant' ? (
                                                    <>
                                                        <Bot className="w-3 h-3 text-primary" />
                                                        <span className="text-[9px] font-medium text-muted-foreground">Claude</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-[9px] font-medium text-muted-foreground">You</span>
                                                        <User className="w-3 h-3 text-muted-foreground" />
                                                    </>
                                                )}
                                            </div>
                                            <div className={cn(
                                                "max-w-[90%] p-2 rounded-lg text-[11px] leading-relaxed",
                                                msg.role === 'user'
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted border border-border/50 text-foreground"
                                            )}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    {isThinking && (
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <div className="flex items-center gap-1.5 px-1">
                                                <Bot className="w-3 h-3 text-primary" />
                                                <span className="text-[9px] font-medium text-muted-foreground">Claude is thinking...</span>
                                            </div>
                                            <div className="bg-muted border border-border/50 p-3 rounded-lg flex gap-1">
                                                <div className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce" />
                                                <div className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                                                <div className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 border-t bg-muted/10">
                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                        <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask about this file..."
                            className="h-8 text-[11px] focus:ring-1"
                            disabled={!apiKey || !selectedFilePath || isThinking}
                        />
                        <Button
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            type="submit"
                            disabled={!chatInput.trim() || !apiKey || !selectedFilePath || isThinking}
                        >
                            <Send className="w-3.5 h-3.5" />
                        </Button>
                    </form>
                    <p className="text-[9px] text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        Responses are AI-generated and should be verified.
                    </p>
                </div>
            </div>
        </div>
    );
}
