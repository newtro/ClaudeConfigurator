import { MonacoEditor } from './MonacoEditor';
import { PatternBuilder } from './PatternBuilder';

interface IgnoreEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    view?: 'visual' | 'code';
}

export function IgnoreEditor({ value, onChange, view = 'visual' }: IgnoreEditorProps) {

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
            {/* Removed redundant header */}

            <div className="flex-1 overflow-hidden relative">
                {view === 'visual' ? (
                    <div className="p-6 h-full overflow-y-auto m-0">
                        <div className="max-w-2xl mx-auto">
                            <PatternBuilder
                                patterns={patterns}
                                onChange={handlePatternsChange}
                                type="ignore"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full m-0">
                        <MonacoEditor
                            language="plaintext"
                            value={value}
                            onChange={onChange}
                            options={{
                                lineNumbers: "on",
                                glyphMargin: true,
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
