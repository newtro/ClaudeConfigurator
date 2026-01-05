import { ConfigTree } from '../tree/ConfigTree';
import { Settings, Sparkles, Moon, Sun, Monitor, FileText } from 'lucide-react';
import { ApiSettings } from '../settings/ApiSettings';
import { Button } from '../ui/button';
import { useConfigStore } from '@/stores/configStore';

export function Sidebar() {
    const { theme, setTheme, isSettingsOpen, setSettingsOpen, setSelectedFilePath } = useConfigStore();

    return (
        <aside className="w-72 shrink-0 border-r bg-card h-full flex flex-col z-10 relative">
            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <h1 className="font-semibold tracking-tight text-sm">Claude Config</h1>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSettingsOpen(true)}
                >
                    <Settings className="w-4 h-4" />
                </Button>
            </div>
            <ConfigTree />
            <div className="p-4 border-t mt-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Ready
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted font-bold uppercase tracking-wider gap-1"
                        onClick={() => setSelectedFilePath('D:\\Repos\\ClaudeConfigurator\\claude-config-manager\\CONFIG_GUIDE.md')}
                    >
                        <FileText className="w-3 h-3" />
                        Docs
                    </Button>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                        const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
                        setTheme(next);
                    }}
                    title={`Theme: ${theme}`}
                >
                    {theme === 'light' && <Sun className="w-3.5 h-3.5" />}
                    {theme === 'dark' && <Moon className="w-3.5 h-3.5" />}
                    {theme === 'system' && <Monitor className="w-3.5 h-3.5" />}
                </Button>
            </div>
            <ApiSettings open={isSettingsOpen} onOpenChange={setSettingsOpen} />
        </aside>
    );
}
