import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

// Claude Code available tools based on official documentation
// Source: https://www.vtrivedy.com/posts/claudecode-tools-reference
export const CLAUDE_CODE_TOOLS = {
    // File Operations
    Read: {
        name: "Read",
        description: "Read file contents",
        category: "File Operations",
        safe: true,
    },
    Write: {
        name: "Write",
        description: "Write/create files",
        category: "File Operations",
        safe: false,
    },
    Edit: {
        name: "Edit",
        description: "Edit existing files",
        category: "File Operations",
        safe: false,
    },
    MultiEdit: {
        name: "MultiEdit",
        description: "Batch file editing",
        category: "File Operations",
        safe: false,
    },
    // Search Tools
    Glob: {
        name: "Glob",
        description: "Find files by pattern",
        category: "Search",
        safe: true,
    },
    Grep: {
        name: "Grep",
        description: "Search file contents",
        category: "Search",
        safe: true,
    },
    LS: {
        name: "LS",
        description: "List directory contents",
        category: "Search",
        safe: true,
    },
    // Shell
    Bash: {
        name: "Bash",
        description: "Execute shell commands",
        category: "Shell",
        safe: false,
        hasPatterns: true,
    },
    // Web
    WebFetch: {
        name: "WebFetch",
        description: "Fetch web content",
        category: "Web",
        safe: true,
    },
    WebSearch: {
        name: "WebSearch",
        description: "Search the web",
        category: "Web",
        safe: true,
    },
    // Notebook
    NotebookRead: {
        name: "NotebookRead",
        description: "Read Jupyter notebooks",
        category: "Notebook",
        safe: true,
    },
    NotebookEdit: {
        name: "NotebookEdit",
        description: "Edit Jupyter notebooks",
        category: "Notebook",
        safe: false,
    },
    // Task Management
    TodoRead: {
        name: "TodoRead",
        description: "Read task list",
        category: "Tasks",
        safe: true,
    },
    TodoWrite: {
        name: "TodoWrite",
        description: "Write task list",
        category: "Tasks",
        safe: false,
    },
    // Agent Tools
    Task: {
        name: "Task",
        description: "Launch subagents",
        category: "Agent",
        safe: false,
    },
} as const;

// Common Bash patterns
export const BASH_PATTERNS = [
    { pattern: "git:*", description: "All git commands" },
    { pattern: "npm:*", description: "All npm commands" },
    { pattern: "npx:*", description: "All npx commands" },
    { pattern: "pnpm:*", description: "All pnpm commands" },
    { pattern: "yarn:*", description: "All yarn commands" },
    { pattern: "bun:*", description: "All bun commands" },
    { pattern: "docker:*", description: "All docker commands" },
    { pattern: "cargo:*", description: "All cargo commands" },
    { pattern: "go:*", description: "All go commands" },
    { pattern: "python:*", description: "All python commands" },
    { pattern: "pytest:*", description: "All pytest commands" },
    { pattern: "pip:*", description: "All pip commands" },
    { pattern: "dotnet:*", description: "All dotnet commands" },
    { pattern: "make:*", description: "All make commands" },
];

interface ToolSelectorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function ToolSelector({ value, onChange, placeholder = "Select tools..." }: ToolSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const [bashPatternInput, setBashPatternInput] = React.useState("");
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Handle wheel events manually for the scrollable container
    const handleWheel = React.useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        const container = scrollRef.current;
        if (container) {
            container.scrollTop += e.deltaY;
            e.stopPropagation();
        }
    }, []);

    // Parse current value into array of tools
    const selectedTools = React.useMemo(() => {
        if (!value) return [];
        return value.split(',').map(t => t.trim()).filter(Boolean);
    }, [value]);

    const toggleTool = (toolName: string) => {
        const newTools = selectedTools.includes(toolName)
            ? selectedTools.filter(t => t !== toolName)
            : [...selectedTools, toolName];
        onChange(newTools.join(', '));
    };

    const addBashPattern = (pattern: string) => {
        const bashTool = `Bash(${pattern})`;
        if (!selectedTools.includes(bashTool)) {
            onChange([...selectedTools, bashTool].join(', '));
        }
    };

    const removeTool = (tool: string) => {
        onChange(selectedTools.filter(t => t !== tool).join(', '));
    };

    const addCustomBashPattern = () => {
        if (bashPatternInput.trim()) {
            addBashPattern(bashPatternInput.trim());
            setBashPatternInput("");
        }
    };

    // Group tools by category
    const toolsByCategory = React.useMemo(() => {
        const categories: Record<string, typeof CLAUDE_CODE_TOOLS[keyof typeof CLAUDE_CODE_TOOLS][]> = {};
        Object.values(CLAUDE_CODE_TOOLS).forEach(tool => {
            if (!categories[tool.category]) {
                categories[tool.category] = [];
            }
            categories[tool.category].push(tool);
        });
        return categories;
    }, []);

    return (
        <div className="space-y-2">
            {/* Selected Tools Display */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 border rounded-md bg-background">
                {selectedTools.length === 0 ? (
                    <span className="text-sm text-muted-foreground">{placeholder}</span>
                ) : (
                    selectedTools.map((tool) => (
                        <Badge
                            key={tool}
                            variant="secondary"
                            className="gap-1 pr-1"
                        >
                            {tool}
                            <button
                                type="button"
                                onClick={() => removeTool(tool)}
                                className="ml-1 hover:bg-muted rounded-full p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    ))
                )}
            </div>

            {/* Tool Selector Popover */}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                        + Add Tools
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-80 p-0"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div
                        ref={scrollRef}
                        className="max-h-[300px] overflow-y-auto overscroll-contain"
                        onWheel={handleWheel}
                    >
                        <div className="p-2 space-y-4">
                            {/* Standard Tools by Category */}
                            {Object.entries(toolsByCategory).map(([category, tools]) => (
                                <div key={category}>
                                    <h4 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                                        {category}
                                    </h4>
                                    <div className="space-y-1">
                                        {tools.map((tool) => {
                                            const isSelected = selectedTools.includes(tool.name);
                                            const isBashSelected = tool.name === 'Bash' &&
                                                selectedTools.some(t => t.startsWith('Bash('));

                                            return (
                                                <button
                                                    key={tool.name}
                                                    type="button"
                                                    onClick={() => toggleTool(tool.name)}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors",
                                                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center",
                                                        isSelected ? "bg-primary border-primary" : "border-input"
                                                    )}>
                                                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{tool.name}</span>
                                                            {tool.safe && (
                                                                <span className="text-[9px] px-1 py-0.5 bg-green-500/10 text-green-600 rounded">
                                                                    safe
                                                                </span>
                                                            )}
                                                            {isBashSelected && !isSelected && (
                                                                <span className="text-[9px] px-1 py-0.5 bg-blue-500/10 text-blue-600 rounded">
                                                                    patterns added
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {tool.description}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Bash Patterns */}
                            <div>
                                <h4 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                                    Bash Patterns
                                </h4>
                                <p className="text-[10px] text-muted-foreground px-2 mb-2">
                                    Restrict Bash to specific commands
                                </p>
                                <div className="grid grid-cols-2 gap-1">
                                    {BASH_PATTERNS.map((bp) => {
                                        const bashTool = `Bash(${bp.pattern})`;
                                        const isSelected = selectedTools.includes(bashTool);
                                        return (
                                            <button
                                                key={bp.pattern}
                                                type="button"
                                                onClick={() => isSelected ? removeTool(bashTool) : addBashPattern(bp.pattern)}
                                                className={cn(
                                                    "px-2 py-1 rounded text-xs text-left transition-colors",
                                                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent"
                                                )}
                                            >
                                                {bp.pattern}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Custom Bash Pattern Input */}
                                <div className="flex gap-1 mt-2 px-1">
                                    <input
                                        type="text"
                                        placeholder="Custom pattern..."
                                        value={bashPatternInput}
                                        onChange={(e) => setBashPatternInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addCustomBashPattern()}
                                        className="flex-1 px-2 py-1 text-xs border rounded bg-background"
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={addCustomBashPattern}
                                        className="h-7 text-xs"
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
