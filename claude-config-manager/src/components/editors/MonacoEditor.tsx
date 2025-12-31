import Editor, { OnMount } from "@monaco-editor/react";
import { useRef } from "react";
import { claudeMdLanguage, claudeTheme } from "@/lib/monaco/claude-lang";

interface MonacoEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    language?: string;
    path?: string;
    options?: any;
}

export function MonacoEditor({
    value,
    onChange,
    language = "markdown",
    options = {},
}: MonacoEditorProps) {
    const editorRef = useRef<any>(null);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Register custom language
        monaco.languages.register({ id: 'claude-md' });
        monaco.languages.setMonarchTokensProvider('claude-md', claudeMdLanguage);

        // Define theme
        monaco.editor.defineTheme("premium-dark", claudeTheme);
        monaco.editor.setTheme("premium-dark");
    };

    return (
        <Editor
            height="100%"
            language={language}
            value={value}
            onChange={onChange}
            onMount={handleEditorDidMount}
            options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                roundedSelection: true,
                scrollBeyondLastLine: false,
                readOnly: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                ...options,
            }}
        />
    );
}
