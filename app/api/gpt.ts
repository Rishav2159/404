// Groq API — Supports model switching and custom system prompts

const MODELS = {
    'quality': 'llama-3.3-70b-versatile',
    'fast': 'llama-3.1-8b-instant',
} as const;

type ModelMode = keyof typeof MODELS;

// LRU Cache
class LRUCache {
    private cache: Map<string, { value: string; timestamp: number }>;
    private maxSize: number;
    private ttl: number;

    constructor(maxSize: number = 100, ttl: number = 1000 * 60 * 60) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    add(key: string, value: string): void {
        if (this.cache.size >= this.maxSize) {
            let oldestKey: string | null = null;
            let oldestTime = Infinity;
            for (const [k, v] of this.cache.entries()) {
                if (v.timestamp < oldestTime) { oldestTime = v.timestamp; oldestKey = k; }
            }
            if (oldestKey) this.cache.delete(oldestKey);
        }
        this.cache.set(key, { value, timestamp: Date.now() });
    }

    get(key: string): string | null {
        const item = this.cache.get(key);
        if (item && Date.now() - item.timestamp < this.ttl) return item.value;
        if (item) this.cache.delete(key);
        return null;
    }
}

const responseCache = new LRUCache(100, 1000 * 60 * 60);

interface ChatMessage {
    text: string;
    type: 'user' | 'ai';
}

export async function streamChat(
    prompt: string,
    history: ChatMessage[],
    onToken: (token: string) => void,
    options?: { model?: ModelMode; systemPrompt?: string; isRegenerate?: boolean }
): Promise<string> {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not set. Get a free key at console.groq.com/keys");
    }

    if (!prompt?.trim()) throw new Error("Message cannot be empty");

    const modelMode = options?.model || 'quality';
    const modelId = MODELS[modelMode] || MODELS.quality;

    // Check cache (skip if regenerating to ensure a fresh response)
    const cacheKey = JSON.stringify({ prompt, history: history.slice(-4), model: modelId });
    if (!options?.isRegenerate) {
        const cached = responseCache.get(cacheKey);
        if (cached) {
            onToken(cached);
            return cached;
        }
    }

    const defaultSystemPrompt = `You are 404 Intelligence — a helpful, concise AI assistant. You have no persistent memory; each conversation starts fresh. Be direct, accurate, and format code in triple backticks with language identifiers. Use markdown formatting for structure (headings, bold, lists) when helpful.`;

    const messages: { role: string; content: string }[] = [
        { role: "system", content: options?.systemPrompt?.trim() || defaultSystemPrompt }
    ];

    // Add conversation history (last 10 for context window)
    for (const msg of history.slice(-10)) {
        messages.push({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.text
        });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: modelId,
            messages,
            max_tokens: 1024,
            temperature: options?.isRegenerate ? 0.8 : 0.3,
            top_p: 0.9,
            stream: true
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error("[chat] Groq error:", response.status, error);
        if (response.status === 401) throw new Error('Invalid API key. Get a free key at console.groq.com/keys');
        if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.');
        throw new Error(error.error?.message || 'AI service error');
    }

    if (!response.body) throw new Error("Streaming not supported");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value);
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data: ') || line.trim() === 'data: [DONE]') continue;
                try {
                    const token = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content;
                    if (token) {
                        fullResponse += token;
                        onToken(token);
                    }
                } catch { /* skip */ }
            }
        }

        if (!options?.isRegenerate) {
            responseCache.add(cacheKey, fullResponse);
        }
        return fullResponse;
    } finally {
        reader.releaseLock();
    }
}