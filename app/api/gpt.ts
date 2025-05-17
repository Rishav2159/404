const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

if (!TOGETHER_API_KEY) {
    throw new Error('TOGETHER_API_KEY environment variable is not set');
}

// Enhanced memory system with LRU cache
class LRUCache {
    private cache: Map<string, { value: string; timestamp: number }>;
    private maxSize: number;
    private ttl: number;
    private hits: number = 0;
    private misses: number = 0;

    constructor(maxSize: number = 100, ttl: number = 1000 * 60 * 60) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    add(key: string, value: string): void {
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    get(key: string): string | null {
        const item = this.cache.get(key);
        if (item && Date.now() - item.timestamp < this.ttl) {
            this.hits++;
            return item.value;
        }
        this.misses++;
        return null;
    }

    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    getStats(): { hits: number; misses: number; hitRate: number } {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0
        };
    }
}

// Token buffer for optimized streaming
class TokenBuffer {
    private buffer: string = '';
    private maxSize: number;
    private onFlush: (tokens: string) => void;

    constructor(maxSize: number = 10, onFlush: (tokens: string) => void) {
        this.maxSize = maxSize;
        this.onFlush = onFlush;
    }

    add(token: string): void {
        this.buffer += token;
        if (this.buffer.length >= this.maxSize) {
            this.flush();
        }
    }

    flush(): void {
        if (this.buffer.length > 0) {
            this.onFlush(this.buffer);
            this.buffer = '';
        }
    }
}

const memorySystem = new LRUCache(100, 1000 * 60 * 60); // 1 hour TTL

export async function main(prompt: string, trained: string, onToken?: (token: string) => void): Promise<string> {
    try {
        // Input validation with early returns
        if (typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new Error("Invalid prompt");
        }

        if (typeof trained !== 'string' || trained.trim().length === 0) {
            throw new Error("Invalid training data");
        }

        // Create memory key
        const memoryKey = `${prompt}|${trained}`;
        
        // Check memory first
        const cached = memorySystem.get(memoryKey);
        if (cached) {
            return cached;
        }

        // Optimize prompt construction
        const optimizedPrompt = `You are a context-aware assistant. Use the provided context to give accurate, relevant responses. Maintain consistency with previous interactions and focus on the most important information.

When providing code snippets, always wrap them in triple backticks with the appropriate language identifier. For example:
\`\`\`javascript
const example = "code";
\`\`\`

Context:
${trained}

User Query:
${prompt}

Response:`;

        const requestBody = {
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            prompt: optimizedPrompt,
            max_tokens: 1024,
            temperature: 0.2,
            top_p: 0.1,
            top_k: 40,
            repetition_penalty: 1.1,
            stop: ["</response>", "END"],
            stream: true
        };

        // Create token buffer if callback is provided
        const tokenBuffer = onToken ? new TokenBuffer(10, onToken) : null;

        const response = await fetch("https://api.together.xyz/inference", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TOGETHER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API Error: ${error.error?.message || JSON.stringify(error)}`);
        }

        if (!response.body) {
            throw new Error("ReadableStream not supported");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let buffer = '';
        let inCodeBlock = false;
        let currentCodeBlock = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                buffer += chunk;

                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.startsWith('data: ')) {
                        const content = line.slice(6);
                        if (content === '[DONE]') continue;

                        try {
                            const data = JSON.parse(content);
                            const token = data.choices?.[0]?.text || 
                                        data.choices?.[0]?.message?.content ||
                                        data.output?.text ||
                                        data.text;
                            
                            if (token) {
                                if (token.includes('```')) {
                                    if (!inCodeBlock) {
                                        inCodeBlock = true;
                                        currentCodeBlock = token;
                                    } else {
                                        inCodeBlock = false;
                                        currentCodeBlock += token;
                                        fullResponse += currentCodeBlock;
                                        if (tokenBuffer) {
                                            tokenBuffer.add(currentCodeBlock);
                                        }
                                        currentCodeBlock = '';
                                    }
                                } else if (inCodeBlock) {
                                    currentCodeBlock += token;
                                } else {
                                    fullResponse += token;
                                    if (tokenBuffer) {
                                        tokenBuffer.add(token);
                                    }
                                }
                            }
                        } catch (e) {
                            // Silent error handling for malformed JSON
                        }
                    }
                }
            }

            // Process remaining buffer
            if (buffer.trim() !== '') {
                try {
                    const content = buffer.slice(6);
                    if (content !== '[DONE]') {
                        const data = JSON.parse(content);
                        const token = data.choices?.[0]?.text || 
                                    data.choices?.[0]?.message?.content ||
                                    data.output?.text ||
                                    data.text;
                        
                        if (token) {
                            if (inCodeBlock) {
                                currentCodeBlock += token;
                                fullResponse += currentCodeBlock;
                            } else {
                                fullResponse += token;
                            }
                            if (tokenBuffer) {
                                tokenBuffer.add(token);
                            }
                        }
                    }
                } catch (e) {
                    // Silent error handling for malformed JSON
                }
            }

            // Flush any remaining tokens
            if (tokenBuffer) {
                tokenBuffer.flush();
            }

            // Store in memory
            memorySystem.add(memoryKey, fullResponse);

            return fullResponse;
        } finally {
            reader.releaseLock();
        }
    } catch (error) {
        throw error;
    }
} 