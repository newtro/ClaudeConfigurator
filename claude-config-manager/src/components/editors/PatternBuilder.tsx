import { useState } from 'react';
import { Plus, X, Shield, EyeOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface PatternBuilderProps {
    patterns: string[];
    onChange: (patterns: string[]) => void;
    type: 'ignore' | 'permission';
    title?: string;
    description?: string;
}

export function PatternBuilder({ patterns, onChange, type, title, description }: PatternBuilderProps) {
    const [newPattern, setNewPattern] = useState('');

    const addPattern = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (newPattern && !patterns.includes(newPattern)) {
            onChange([...patterns, newPattern]);
            setNewPattern('');
        }
    };

    const removePattern = (pattern: string) => {
        onChange(patterns.filter(p => p !== pattern));
    };

    const commonPatterns = type === 'ignore'
        ? ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.DS_Store', '*.log']
        : ['read', 'write', 'execute', 'net'];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        {type === 'ignore' ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Shield className="w-4 h-4 text-primary" />}
                        {title || (type === 'ignore' ? 'Ignore Patterns' : 'Permissions')}
                    </h3>
                    <p className="text-xs text-muted-foreground italic">
                        {description || (type === 'ignore' ? 'Filter files Claude should not see' : 'Define what Claude is allowed to do')}
                    </p>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px] text-[10px]">
                            {type === 'ignore'
                                ? "Use glob patterns like 'src/**/*.test.ts'. Lines starting with '#' are comments."
                                : "Define fine-grained permissions for specific paths or actions."}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <form onSubmit={addPattern} className="flex gap-2">
                <Input
                    value={newPattern}
                    onChange={(e) => setNewPattern(e.target.value)}
                    placeholder={type === 'ignore' ? "Enter glob pattern... (e.g. temp/**)" : "Enter permission..."}
                    className="h-9 text-xs"
                    aria-label={type === 'ignore' ? "New ignore pattern" : "New permission"}
                />
                <Button type="submit" size="sm" className="h-9" aria-label="Add pattern">
                    <Plus className="w-4 h-4" />
                </Button>
            </form>

            <div className="flex flex-wrap gap-2">
                {patterns.length === 0 && (
                    <p className="text-xs text-muted-foreground w-full py-4 text-center border border-dashed rounded-lg">
                        No patterns defined.
                    </p>
                )}
                {patterns.map((pattern) => (
                    <Badge
                        key={pattern}
                        variant="secondary"
                        className="pl-2 pr-1 py-1 gap-1 text-[11px] font-mono group"
                    >
                        {pattern}
                        <button
                            onClick={() => removePattern(pattern)}
                            className="p-0.5 hover:bg-muted rounded-full transition-colors opacity-50 group-hover:opacity-100"
                            aria-label={`Remove ${pattern}`}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </Badge>
                ))}
            </div>

            {commonPatterns.filter(p => !patterns.includes(p)).length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested</p>
                    <div className="flex flex-wrap gap-1.5">
                        {commonPatterns.filter(p => !patterns.includes(p)).map(p => (
                            <button
                                key={p}
                                onClick={() => onChange([...patterns, p])}
                                className="text-[10px] px-2 py-0.5 bg-muted/50 hover:bg-muted text-muted-foreground rounded-full transition-colors border"
                                aria-label={`Add suggestion: ${p}`}
                            >
                                + {p}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
