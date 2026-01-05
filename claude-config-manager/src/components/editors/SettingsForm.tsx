import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MonacoEditor } from './MonacoEditor';
import { Settings2, Shield } from 'lucide-react';
import { PatternBuilder } from './PatternBuilder';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SettingsFormProps {
    value: string;
    onChange: (value: string | undefined) => void;
    view?: 'form' | 'json';
}

export function SettingsForm({ value, onChange, view = 'form' }: SettingsFormProps) {
    const [jsonData, setJsonData] = useState<any>({});

    useEffect(() => {
        try {
            setJsonData(JSON.parse(value));
        } catch (e) {
            // Ignored: invalid JSON should still be editable in raw mode
        }
    }, [value]);

    const updateField = (field: string, val: any) => {
        const newData = { ...jsonData, [field]: val };
        setJsonData(newData);
        onChange(JSON.stringify(newData, null, 2));
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-hidden">
                {view === 'form' ? (
                    <ScrollArea className="h-full">
                        <div className="p-6 space-y-8 max-w-2xl mx-auto">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">General</h3>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="model">Primary Model</Label>
                                    <Input
                                        id="model"
                                        value={jsonData.model || ''}
                                        onChange={(e) => updateField('model', e.target.value)}
                                        placeholder="e.g. claude-3-opus"
                                        className="h-9 transition-all focus:ring-1"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="theme">CLI Theme</Label>
                                    <Input
                                        id="theme"
                                        value={jsonData.theme || ''}
                                        onChange={(e) => updateField('theme', e.target.value)}
                                        placeholder="e.g. dark"
                                        className="h-9 transition-all focus:ring-1"
                                    />
                                </div>
                            </div>

                            <Separator />

                            <PatternBuilder
                                type="permission"
                                patterns={Array.isArray(jsonData.permissions) ? jsonData.permissions : []}
                                onChange={(p) => updateField('permissions', p)}
                                title="Capability Permissions"
                                description="Define what Claude is allowed to do in this environment."
                            />

                            <div className="p-4 bg-muted/20 border rounded-lg flex gap-3">
                                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    These settings are saved to your global or project-specific <code className="text-foreground">settings.json</code>.
                                    Claude Code will respect these boundaries for tools and file access.
                                </p>
                            </div>
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="h-full">
                        <MonacoEditor
                            language="json"
                            value={value}
                            onChange={onChange}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
