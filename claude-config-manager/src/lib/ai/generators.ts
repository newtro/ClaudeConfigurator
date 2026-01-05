import { getAnthropicClient } from '../anthropic';

// File type detection helpers
function getFileType(fileName: string, filePath: string): string {
    const lowerName = fileName.toLowerCase();
    const lowerPath = filePath.toLowerCase();

    if (lowerName === 'claude.md' || lowerName === 'claude.local.md') return 'claude-md';
    if (lowerName === 'settings.json' || lowerName === 'settings.local.json') return 'settings';
    if (lowerName === '.claude.json' || lowerName === 'managed-mcp.json' || lowerName === '.mcp.json') return 'mcp';
    if (lowerPath.includes('/commands/') || lowerPath.includes('\\commands\\')) return 'command';
    if (lowerPath.includes('/agents/') || lowerPath.includes('\\agents\\')) return 'agent';
    if (lowerPath.includes('/rules/') || lowerPath.includes('\\rules\\')) return 'rule';
    if (lowerPath.includes('/skills/') || lowerPath.includes('\\skills\\')) return 'skill';
    if (lowerName.endsWith('.json')) return 'json';
    if (lowerName.endsWith('.md')) return 'markdown';
    return 'unknown';
}

// Specific prompts for each file type
const FILE_PROMPTS: Record<string, string> = {
    'claude-md': `Generate a CLAUDE.md configuration file. This file provides instructions to Claude Code about the project.

CRITICAL: Output ONLY the raw markdown content. Do NOT wrap it in code fences. Do NOT include any explanations.

The file should include these sections:
# Project Overview
Brief description of what this project/environment is for.

## Build Commands
\`\`\`bash
# Actual build commands for common project types
npm run build
\`\`\`

## Lint Commands
\`\`\`bash
npm run lint
\`\`\`

## Test Commands
\`\`\`bash
npm test
\`\`\`

## Code Style
- Key coding conventions
- Naming patterns
- File organization

Output the actual CLAUDE.md content now:`,

    'settings': `Generate a Claude Code settings.json file.

CRITICAL: Output ONLY valid JSON. No markdown, no explanations, no code fences.

The JSON should have this structure:
{
  "permissions": {
    "allow": [],
    "deny": []
  },
  "env": {}
}

Common permissions to allow: "Bash(npm:*)", "Bash(git:*)", "Read", "Write", "Edit"

Output the JSON now:`,

    'mcp': `Generate a Claude Code MCP (Model Context Protocol) configuration file.

CRITICAL: Output ONLY valid JSON. No markdown, no explanations, no code fences.

The JSON should have this structure:
{
  "mcpServers": {}
}

Example server entry:
"mcpServers": {
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-filesystem", "/path/to/allowed/dir"]
  }
}

Output an empty but valid MCP config JSON now:`,

    'command': `Generate a Claude Code custom slash command file.

CRITICAL: Output ONLY the raw markdown content. No code fences wrapping the entire output.

Format:
---
description: Brief description of what this command does
allowed-tools: Bash(git:*), Read, Write
argument-hint: <optional-argument>
---

Instructions for Claude when this command is invoked.

Example command that creates a git commit:
---
description: Create a git commit with a message
allowed-tools: Bash(git:*)
argument-hint: <commit-message>
---

Create a git commit with the provided message: $ARGUMENTS

If no message provided, analyze the changes and suggest an appropriate commit message.

Output a useful command now:`,

    'agent': `Generate a Claude Code agent definition file.

CRITICAL: Output ONLY the raw markdown content. No code fences wrapping the entire output.

Agents are specialized AI assistants for specific tasks. Format:

---
name: agent-name
description: What this agent specializes in
model: claude-sonnet-4-5
tools: Read, Write, Edit, Bash(npm:*), Bash(git:*)
---

# Agent Instructions

Detailed instructions for how this agent should behave and what it specializes in.

## Capabilities
- Specific things this agent can do

## Guidelines
- How the agent should approach tasks

Output a useful agent definition now:`,

    'rule': `Generate a Claude Code rule file for the rules/ directory.

CRITICAL: Output ONLY the raw markdown content. No code fences wrapping the entire output.

Rules provide specific guidelines for Claude to follow. Format:

# Rule Title

## When to Apply
Describe when this rule should be considered.

## Guidelines
- Specific guideline 1
- Specific guideline 2

## Examples
Show good and bad examples if relevant.

Output a useful rule now:`,

    'skill': `Generate a SKILL.md file for a Claude Code skill.

CRITICAL: Output ONLY the raw markdown content. No code fences wrapping the entire output.

Skills are modular abilities Claude can use. Format:

---
name: skill-name
description: What this skill does
triggers:
  - keyword or phrase that activates this skill
---

# Skill Instructions

Detailed instructions for how to perform this skill.

## Steps
1. Step one
2. Step two

## Output Format
Describe the expected output.

Output a useful skill definition now:`,
};

export async function generateClaudeMdSection(
    apiKey: string,
    sectionName: string,
    projectContext: string,
    model: string = "claude-sonnet-4-5"
): Promise<string> {
    const anthropic = getAnthropicClient(apiKey);

    const prompt = `Generate ONLY the "${sectionName}" section for a CLAUDE.md file.
Project Context: ${projectContext}

CRITICAL: Output only the section content starting with ## ${sectionName}. No explanations.

Example format:
## ${sectionName}
\`\`\`bash
command here
\`\`\`
`;

    const response = await anthropic.messages.create({
        model: model,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
    });

    return (response.content[0] as any).text;
}

export async function suggestIgnorePatterns(
    apiKey: string,
    fileList: string[],
    model: string = "claude-haiku-4-5"
): Promise<string[]> {
    const anthropic = getAnthropicClient(apiKey);

    const prompt = `Based on this list of files in a project, suggest common patterns to add to a .claudeignore file.
Return ONLY a comma-separated list of glob patterns, nothing else.

Files:
${fileList.slice(0, 100).join('\n')}
`;

    const response = await anthropic.messages.create({
        model: model,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
    });

    const text = (response.content[0] as any).text;
    return text.split(',').map((p: string) => p.trim());
}

export async function generateFullConfigFile(
    apiKey: string,
    fileName: string,
    filePath: string,
    projectContext: string = "A software project",
    model: string = "claude-sonnet-4-5"
): Promise<string> {
    const anthropic = getAnthropicClient(apiKey);

    const fileType = getFileType(fileName, filePath);
    const basePrompt = FILE_PROMPTS[fileType] || FILE_PROMPTS['claude-md'];

    const contextInfo = projectContext !== "A software project"
        ? `\n\nProject Context: ${projectContext}`
        : '';

    const response = await anthropic.messages.create({
        model: model,
        max_tokens: 2000,
        messages: [{
            role: "user",
            content: basePrompt + contextInfo
        }],
    });

    let content = (response.content[0] as any).text;

    // Post-process: strip outer code fences if the AI added them anyway
    content = stripOuterCodeFence(content);

    // For JSON files, validate and fix if needed
    if (fileType === 'settings' || fileType === 'mcp' || fileType === 'json') {
        content = ensureValidJson(content);
    }

    return content;
}

// Strip outer markdown code fence if present
function stripOuterCodeFence(content: string): string {
    const trimmed = content.trim();

    // Match ```json, ```markdown, ```md, or just ``` at start and ``` at end
    const fenceMatch = trimmed.match(/^```(?:json|markdown|md|bash)?\s*\n([\s\S]*?)\n```\s*$/);
    if (fenceMatch) {
        return fenceMatch[1].trim();
    }

    return trimmed;
}

// Ensure content is valid JSON, return empty object if not
function ensureValidJson(content: string): string {
    try {
        JSON.parse(content);
        return content;
    } catch {
        // Try to extract JSON from the content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                JSON.parse(jsonMatch[0]);
                return jsonMatch[0];
            } catch {
                // Return minimal valid JSON
                return '{}';
            }
        }
        return '{}';
    }
}

// Validate if a config file appears to be properly formatted
export function validateConfigFile(content: string, fileName: string, filePath: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const fileType = getFileType(fileName, filePath);

    if (!content || content.trim().length === 0) {
        return { valid: false, issues: ['File is empty'] };
    }

    switch (fileType) {
        case 'settings':
        case 'mcp':
        case 'json':
            try {
                JSON.parse(content);
            } catch (e) {
                issues.push('Invalid JSON syntax');
            }
            break;

        case 'claude-md':
            // Check if it looks like instructions rather than actual content
            if (content.includes('Create the following file') ||
                content.includes('should contain') ||
                content.includes('Here is an example')) {
                issues.push('File contains instructions instead of actual configuration');
            }
            // Check for outer code fence wrapping everything
            if (content.trim().startsWith('```markdown') || content.trim().startsWith('```md')) {
                issues.push('Content is wrapped in unnecessary code fence');
            }
            break;

        case 'command':
        case 'agent':
        case 'rule':
        case 'skill':
            // Check for frontmatter
            if (!content.trim().startsWith('---')) {
                issues.push('Missing frontmatter (should start with ---)');
            }
            // Check for instruction-like content
            if (content.includes('Create the following') ||
                content.includes('should look like')) {
                issues.push('File contains instructions instead of actual configuration');
            }
            break;
    }

    return { valid: issues.length === 0, issues };
}
