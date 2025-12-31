import { useState } from 'react';
import { MonacoEditor } from './MonacoEditor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Columns, Eye, Code } from 'lucide-react';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
    const [view, setView] = useState<'edit' | 'preview' | 'split'>('split');

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
                <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-[300px]">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="edit" className="text-xs">
                            <Code className="w-3 h-3 mr-2" />
                            Edit
                        </TabsTrigger>
                        <TabsTrigger value="split" className="text-xs">
                            <Columns className="w-3 h-3 mr-2" />
                            Split
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="text-xs">
                            <Eye className="w-3 h-3 mr-2" />
                            Preview
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {(view === 'edit' || view === 'split') && (
                    <div className={`${view === 'split' ? 'w-1/2 border-r' : 'w-full'} h-full`}>
                        <MonacoEditor
                            language="claude-md"
                            value={value}
                            onChange={onChange}
                        />
                    </div>
                )}

                {(view === 'preview' || view === 'split') && (
                    <ScrollArea className={`${view === 'split' ? 'w-1/2' : 'w-full'} h-full bg-background`}>
                        <div className="p-8 prose prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {value}
                            </ReactMarkdown>
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
}
