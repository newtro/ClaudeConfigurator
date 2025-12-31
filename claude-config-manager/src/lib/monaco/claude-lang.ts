import type { languages } from 'monaco-editor';

export const claudeMdLanguage: languages.IMonarchLanguage = {
    defaultToken: '',
    tokenPostfix: '.claude',

    // Symbols and delimiters
    symbols: /[=><!~?:&|+\-*\/\^%]+/,

    // Keywords common in CLAUDE.md
    keywords: [
        'Build', 'Test', 'Project rules', 'Environment', 'Setup',
        'npm', 'yarn', 'pnpm', 'npx', 'node',
        'python', 'pip', 'pytest', 'flask', 'django',
        'cargo', 'rustc', 'rustup',
        'git', 'docker', 'docker-compose'
    ],

    tokenizer: {
        root: [
            // Headers
            [/^#+.*$/, {
                cases: {
                    '@keywords': 'keyword.header',
                    '@default': 'header'
                }
            }],

            // Code blocks
            [/`[^`]*`/, 'code'],
            [/^```.*$/, { token: 'code.quote', next: '@codeblock' }],

            // Inline keywords
            [/[a-zA-Z_]\w*/, {
                cases: {
                    '@keywords': 'keyword',
                    '@default': 'identifier'
                }
            }],

            // Comments
            [/#.*$/, 'comment'],
        ],

        codeblock: [
            [/^```$/, { token: 'code.quote', next: '@pop' }],
            [/.*$/, 'code.content'],
        ],
    }
};

export const claudeTheme: any = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: 'header', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'keyword.header', foreground: 'f472b6', fontStyle: 'bold' },
        { token: 'keyword', foreground: '94a3b8' },
        { token: 'code', foreground: 'facc15' },
        { token: 'code.quote', foreground: '475569' },
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
    ],
    colors: {
        'editor.background': '#020617',
        'editor.lineHighlightBackground': '#1e293b33',
    }
};
