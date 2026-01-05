import { useState, useRef, useEffect } from 'react';
import { MonacoEditor } from './MonacoEditor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    view?: 'edit' | 'preview' | 'split';
}

// Strip outer markdown code fence if present (e.g., ```markdown ... ```)
function preprocessMarkdown(content: string): string {
    const trimmed = content.trim();
    // Check if content starts with ```markdown or ```md and ends with ```
    const fenceMatch = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*)\n```\s*$/);
    if (fenceMatch) {
        return fenceMatch[1];
    }
    return content;
}

export function MarkdownEditor({ value, onChange, view = 'split' }: MarkdownEditorProps) {
    const [editor, setEditor] = useState<any>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const isSyncing = useRef(false);

    // Preprocess the markdown for preview (strip outer fence if present)
    const processedValue = preprocessMarkdown(value);

    useEffect(() => {
        if (view !== 'split' || !editor || !previewRef.current) return;

        const preview = previewRef.current;

        const handleEditorScroll = () => {
            if (isSyncing.current) return;
            isSyncing.current = true;

            const scrollInfo = editor.getScrollTop();
            const scrollHeight = editor.getScrollHeight();
            const clientHeight = editor.getLayoutInfo().height;

            const maxEditorScroll = scrollHeight - clientHeight;
            if (maxEditorScroll > 0) {
                const ratio = scrollInfo / maxEditorScroll;
                preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
            }

            setTimeout(() => { isSyncing.current = false; }, 50);
        };

        const handlePreviewScroll = () => {
            if (isSyncing.current) return;
            isSyncing.current = true;

            const maxPreviewScroll = preview.scrollHeight - preview.clientHeight;
            if (maxPreviewScroll > 0) {
                const ratio = preview.scrollTop / maxPreviewScroll;
                const editorScrollHeight = editor.getScrollHeight();
                const editorClientHeight = editor.getLayoutInfo().height;

                editor.setScrollTop(ratio * (editorScrollHeight - editorClientHeight));
            }

            setTimeout(() => { isSyncing.current = false; }, 50);
        };

        const editorScrollDisposable = editor.onDidScrollChange(handleEditorScroll);
        preview.addEventListener('scroll', handlePreviewScroll);

        return () => {
            editorScrollDisposable.dispose();
            preview.removeEventListener('scroll', handlePreviewScroll);
        };
    }, [view, editor]);

    return (
        <div className="flex flex-col h-full overflow-hidden">


            <div className="flex-1 flex overflow-hidden">
                {(view === 'edit' || view === 'split') && (
                    <div className={`${view === 'split' ? 'w-1/2 border-r' : 'w-full'} h-full relative`}>
                        <MonacoEditor
                            language="claude-md"
                            value={value}
                            onChange={onChange}
                            onMount={(e) => {
                                setEditor(e);
                            }}
                        />
                    </div>
                )}

                {(view === 'preview' || view === 'split') && (
                    <ScrollArea
                        viewportRef={previewRef}
                        className={`${view === 'split' ? 'w-1/2' : 'w-full'} h-full bg-background`}
                    >
                        <div className="p-6 markdown-preview">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ children }) => <h1 className="text-3xl font-bold mb-6 text-foreground">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b border-border text-foreground">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">{children}</h3>,
                                    h4: ({ children }) => <h4 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h4>,
                                    p: ({ children }) => <p className="mb-4 text-muted-foreground leading-relaxed">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-muted-foreground space-y-1">{children}</ol>,
                                    li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                                    a: ({ href, children }) => <a href={href} className="text-primary hover:underline">{children}</a>,
                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">{children}</blockquote>,
                                    hr: () => <hr className="my-8 border-border" />,
                                    strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                                    em: ({ children }) => <em className="italic text-foreground">{children}</em>,
                                    pre: ({ children }) => <pre className="bg-secondary rounded-lg p-4 overflow-x-auto my-4 text-sm">{children}</pre>,
                                    code: ({ node, inline, className, children, ...props }: any) => {
                                        if (inline) {
                                            return <code className="bg-secondary text-foreground px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
                                        }
                                        return <code className="text-foreground font-mono text-sm" {...props}>{children}</code>;
                                    },
                                    table: ({ children }) => <table className="w-full border-collapse my-4">{children}</table>,
                                    th: ({ children }) => <th className="border border-border px-4 py-2 bg-secondary text-foreground font-semibold text-left">{children}</th>,
                                    td: ({ children }) => <td className="border border-border px-4 py-2 text-muted-foreground">{children}</td>,
                                }}
                            >
                                {processedValue}
                            </ReactMarkdown>
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
}
