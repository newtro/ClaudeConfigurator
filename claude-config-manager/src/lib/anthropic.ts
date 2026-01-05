import Anthropic from '@anthropic-ai/sdk';

export function getAnthropicClient(apiKey: string) {
    return new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true, // Specific for this client-side desktop app
    });
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
    try {
        const anthropic = getAnthropicClient(apiKey);
        await anthropic.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }],
        });
        return true;
    } catch (err) {
        console.error('API Key validation failed:', err);
        return false;
    }
}
