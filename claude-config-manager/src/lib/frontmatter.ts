// Frontmatter parsing utilities for Claude Code config files

export interface AgentFrontmatter {
    name: string;
    description: string;
    tools?: string;
    model?: string;
    permissionMode?: string;
    skills?: string;
    [key: string]: unknown;
}

export interface CommandFrontmatter {
    description: string;
    'allowed-tools'?: string;
    'argument-hint'?: string;
    [key: string]: unknown;
}

export interface SkillFrontmatter {
    name: string;
    description: string;
    'allowed-tools'?: string;
    model?: string;
    [key: string]: unknown;
}

export interface ParsedFrontmatter<T> {
    frontmatter: T | null;
    content: string;
    raw: string;
    isValid: boolean;
    errors: string[];
}

/**
 * Parse YAML frontmatter from a markdown file
 */
export function parseFrontmatter<T extends Record<string, unknown>>(
    fileContent: string
): ParsedFrontmatter<T> {
    const errors: string[] = [];
    const trimmed = fileContent.trim();

    // Check if file starts with frontmatter delimiter
    if (!trimmed.startsWith('---')) {
        return {
            frontmatter: null,
            content: fileContent,
            raw: '',
            isValid: false,
            errors: ['File does not start with frontmatter (---)']
        };
    }

    // Find the closing delimiter
    const endIndex = trimmed.indexOf('---', 3);
    if (endIndex === -1) {
        return {
            frontmatter: null,
            content: fileContent,
            raw: '',
            isValid: false,
            errors: ['Frontmatter is not closed (missing closing ---)']
        };
    }

    const rawFrontmatter = trimmed.slice(3, endIndex).trim();
    const content = trimmed.slice(endIndex + 3).trim();

    // Parse YAML-like frontmatter (simple key: value pairs)
    const frontmatter: Record<string, unknown> = {};
    const lines = rawFrontmatter.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        const colonIndex = trimmedLine.indexOf(':');
        if (colonIndex === -1) {
            errors.push(`Invalid frontmatter line: ${trimmedLine}`);
            continue;
        }

        const key = trimmedLine.slice(0, colonIndex).trim();
        let value: unknown = trimmedLine.slice(colonIndex + 1).trim();

        // Handle array values (triggers: - item format)
        if (value === '') {
            // Check if next lines are array items
            const arrayItems: string[] = [];
            const lineIndex = lines.indexOf(line);
            for (let i = lineIndex + 1; i < lines.length; i++) {
                const nextLine = lines[i].trim();
                if (nextLine.startsWith('- ')) {
                    arrayItems.push(nextLine.slice(2).trim());
                } else if (nextLine && !nextLine.startsWith('#')) {
                    break;
                }
            }
            if (arrayItems.length > 0) {
                value = arrayItems;
            }
        }

        // Remove surrounding quotes if present
        if (typeof value === 'string') {
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
        }

        frontmatter[key] = value;
    }

    return {
        frontmatter: frontmatter as T,
        content,
        raw: rawFrontmatter,
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Generate frontmatter string from an object
 */
export function generateFrontmatter(data: Record<string, unknown>): string {
    const lines: string[] = ['---'];

    for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null || value === '') continue;

        if (Array.isArray(value)) {
            lines.push(`${key}:`);
            for (const item of value) {
                lines.push(`  - ${item}`);
            }
        } else {
            // Quote values that contain special characters
            const strValue = String(value);
            if (strValue.includes(':') || strValue.includes('#') || strValue.includes('\n')) {
                lines.push(`${key}: "${strValue.replace(/"/g, '\\"')}"`);
            } else {
                lines.push(`${key}: ${strValue}`);
            }
        }
    }

    lines.push('---');
    return lines.join('\n');
}

/**
 * Validate agent frontmatter
 */
export function validateAgentFrontmatter(fm: AgentFrontmatter | null): string[] {
    const errors: string[] = [];

    if (!fm) {
        errors.push('Missing frontmatter');
        return errors;
    }

    if (!fm.name) {
        errors.push('Missing required field: name');
    } else if (!/^[a-z0-9-]+$/.test(fm.name)) {
        errors.push('Name must be lowercase letters, numbers, and hyphens only');
    }

    if (!fm.description) {
        errors.push('Missing required field: description');
    }

    if (fm.model && !['sonnet', 'opus', 'haiku', 'inherit'].includes(fm.model.toLowerCase())) {
        errors.push('Model must be one of: sonnet, opus, haiku, inherit');
    }

    if (fm.permissionMode && !['default', 'acceptEdits', 'dontAsk', 'bypassPermissions', 'plan', 'ignore'].includes(fm.permissionMode)) {
        errors.push('Invalid permissionMode value');
    }

    return errors;
}

/**
 * Validate command frontmatter
 */
export function validateCommandFrontmatter(fm: CommandFrontmatter | null): string[] {
    const errors: string[] = [];

    if (!fm) {
        errors.push('Missing frontmatter');
        return errors;
    }

    if (!fm.description) {
        errors.push('Missing required field: description');
    }

    return errors;
}

/**
 * Validate skill frontmatter
 */
export function validateSkillFrontmatter(fm: SkillFrontmatter | null): string[] {
    const errors: string[] = [];

    if (!fm) {
        errors.push('Missing frontmatter');
        return errors;
    }

    if (!fm.name) {
        errors.push('Missing required field: name');
    } else {
        // Skill name constraints: max 64 chars, lowercase/numbers/hyphens only
        if (fm.name.length > 64) {
            errors.push('Name must be 64 characters or less');
        }
        if (!/^[a-z0-9-]+$/.test(fm.name)) {
            errors.push('Name must be lowercase letters, numbers, and hyphens only');
        }
        if (fm.name.includes('anthropic') || fm.name.includes('claude')) {
            errors.push('Name cannot contain "anthropic" or "claude"');
        }
    }

    if (!fm.description) {
        errors.push('Missing required field: description');
    } else {
        // Description constraints: max 1024 chars, no XML tags
        if (fm.description.length > 1024) {
            errors.push('Description must be 1024 characters or less');
        }
        if (/<[^>]+>/.test(fm.description)) {
            errors.push('Description cannot contain XML tags');
        }
    }

    return errors;
}
