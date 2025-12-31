import { MonacoEditor } from './MonacoEditor';
import { PatternBuilder } from './PatternBuilder';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Code } from 'lucide-react';

interface IgnoreEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
}

export function IgnoreEditor({ value, onChange }: IgnoreEditorProps) {
    const [view, setView] = useState<'visual' | 'code'>('visual');

    // Simple parser: filter out empty lines and comments for the visual builder
    const patterns = value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

    const handlePatternsChange = (newPatterns: string[]) => {
        // Preserving comments is hard with a simple split/join, 
        // but for now we'll just join with newlines. 
        // Advanced version would preserve comments.
        const comments = value.split('\n').filter(line => line.trim().startsWith('#'));
        const newValue = [...comments, ...newPatterns].join('\n');
        onChange(newValue);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b bg-muted/10 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold">.claudeignore</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Manage files and directories Claude should not access.
                    </p>
                </div>
                <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-[180px]">
                    <TabsList className="grid w-full grid-cols-2 h-8">
                        <TabsTrigger value="visual" className="text-[10px] gap-1.5">
                            <Eye className="w-3 h-3" />
                            Visual
                        </TabsTrigger>
                        <TabsTrigger value="code" className="text-[10px] gap-1.5">
                            <Code className="w-3 h-3" />
                            Code
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <Tabs value={view} className="h-full">
                    <TabsContent value="visual" className="p-6 h-full overflow-y-auto m-0">
                        <div className="max-w-2xl mx-auto">
                            <PatternBuilder
                                patterns={patterns}
                                onChange={handlePatternsChange}
                                type="ignore"
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="code" className="h-full m-0">
                        <MonacoEditor
                            language="plaintext"
                            value={value}
                            onChange={onChange}
                            options={{
                                lineNumbers: "on",
                                glyphMargin: true,
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
