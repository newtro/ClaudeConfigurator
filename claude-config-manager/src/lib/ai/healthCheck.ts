export interface HealthIssue {
    id: string;
    type: 'warning' | 'info' | 'error';
    title: string;
    description: string;
    action: string;
    targetFile: string;
    context?: string;
}

export function analyzeClaudeMd(content: string, filePath: string): HealthIssue[] {
    const issues: HealthIssue[] = [];

    const sections = [
        { name: 'Build', pattern: /#+.*Build/i },
        { name: 'Test', pattern: /#+.*Test/i },
        { name: 'Project Rules', pattern: /#+.*Project rules/i },
    ];

    sections.forEach(section => {
        if (!section.pattern.test(content)) {
            issues.push({
                id: `missing-${section.name.toLowerCase().replace(' ', '-')}`,
                type: 'warning',
                title: `Missing ${section.name} Section`,
                description: `Your CLAUDE.md is missing clear instructions for ${section.name.toLowerCase()}.`,
                action: `Generate ${section.name}`,
                targetFile: filePath
            });
        }
    });

    return issues;
}

export function analyzeSettingsJson(content: string, filePath: string): HealthIssue[] {
    const issues: HealthIssue[] = [];
    try {
        const settings = JSON.parse(content);

        if (!settings.model) {
            issues.push({
                id: 'missing-model',
                type: 'info',
                title: 'No Preferred Model',
                description: 'You haven\'t specified a preferred Claude model in your settings.',
                action: 'Configure Model',
                targetFile: filePath
            });
        }

        if (settings.theme === undefined) {
            issues.push({
                id: 'missing-theme',
                type: 'info',
                title: 'Theme not set',
                description: 'Setting a custom theme can improve readability in different environments.',
                action: 'Set Theme',
                targetFile: filePath
            });
        }
    } catch (e) {
        issues.push({
            id: 'invalid-json',
            type: 'error',
            title: 'Invalid JSON',
            description: 'Your settings.json file contains syntax errors.',
            action: 'Fix JSON',
            targetFile: filePath
        });
    }
    return issues;
}
