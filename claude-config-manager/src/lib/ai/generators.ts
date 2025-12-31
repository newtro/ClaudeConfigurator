import { getAnthropicClient } from '../anthropic';

export async function generateClaudeMdSection(
    apiKey: string,
    sectionName: string,
    projectContext: string
): Promise<string> {
    const anthropic = getAnthropicClient(apiKey);

    const prompt = `You are an expert at configuring Claude Code. 
Generate a "${sectionName}" section for a CLAUDE.md file.
Project Context: ${projectContext}

Guidelines:
- Use clear, concise commands.
- Follow the standard CLAUDE.md formatting.
- Only provide the section content, starting with a level 2 header.

Example for Build:
## Build
\`npm run build\`
`;

    const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
    });

    return (response.content[0] as any).text;
}

export async function suggestIgnorePatterns(
    apiKey: string,
    fileList: string[]
): Promise<string[]> {
    const anthropic = getAnthropicClient(apiKey);

    const prompt = `Based on this list of files in a project, suggest common patterns to add to a .claudeignore file to reduce noise and token usage.
Return ONLY a comma-separated list of patterns.

Files:
${fileList.slice(0, 100).join('\n')}
`;

    const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
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
    projectContext: string = "A software project"
): Promise<string> {
    const anthropic = getAnthropicClient(apiKey);

    const isClaudeMd = fileName.toLowerCase() === 'claude.md';
    const isSettings = fileName.toLowerCase().endsWith('.json');

    const prompt = isClaudeMd
        ? `Generate a complete CLAUDE.md file for the project at: ${filePath}.
           Project Context: ${projectContext}
           Include sections for: Build, Lint, Test, and environment-specific instructions.
           Only provide the markdown content.`
        : isSettings
            ? `Generate a standard settings.json file for Claude Code at: ${filePath}.
           Return ONLY valid JSON content.`
            : `Generate a template content for ${fileName} at ${filePath}.`;

    const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
    });

    return (response.content[0] as any).text;
}
