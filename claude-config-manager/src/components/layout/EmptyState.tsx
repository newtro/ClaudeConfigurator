import { Sparkles, PlusCircle, LayoutGrid } from 'lucide-react';

export function EmptyState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-muted/5 animate-in fade-in duration-500">
            <div className="relative mb-8">
                <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center rotate-3 scale-110 blur-xl absolute inset-0" />
                <div className="w-24 h-24 bg-background border shadow-xl rounded-3xl flex items-center justify-center relative">
                    <LayoutGrid className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-card border shadow-lg rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
            </div>

            <div className="text-center max-w-sm space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Welcome to Claude Config</h2>
                <p className="text-muted-foreground leading-relaxed">
                    Automate and manage your Claude Code configurations across all your projects in one place.
                </p>

                <div className="grid grid-cols-1 gap-2 pt-4">
                    <div className="p-3 rounded-lg border bg-card/50 text-left flex items-start gap-3 hover:bg-card transition-colors cursor-default">
                        <div className="mt-0.5 p-1 bg-blue-500/10 rounded text-blue-500">
                            <PlusCircle className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-medium text-sm">Select a Project</div>
                            <div className="text-[12px] text-muted-foreground">Pick a project from the sidebar to start editing.</div>
                        </div>
                    </div>

                    <div className="p-3 rounded-lg border bg-card/50 text-left flex items-start gap-3 hover:bg-card transition-colors cursor-default">
                        <div className="mt-0.5 p-1 bg-primary/10 rounded text-primary">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-medium text-sm">AI Suggestions</div>
                            <div className="text-[12px] text-muted-foreground">Get real-time health checks and rule generations.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
