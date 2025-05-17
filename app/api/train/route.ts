import { NextResponse } from 'next/server';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

if (!TOGETHER_API_KEY) {
    throw new Error('TOGETHER_API_KEY environment variable is not set');
}

// Cache configuration
const CACHE = {
    store: new Map<string, { value: string; timestamp: number }>(),
    maxSize: 1000,
    ttl: 1000 * 60 * 60, // 1 hour
    hits: 0,
    misses: 0,

    get(key: string): string | null {
        const item = this.store.get(key);
        if (item && Date.now() - item.timestamp < this.ttl) {
            this.hits++;
            return item.value;
        }
        this.misses++;
        return null;
    },

    set(key: string, value: string): void {
        if (this.store.size >= this.maxSize) {
            this.evictOldest();
        }
        this.store.set(key, {
            value,
            timestamp: Date.now()
        });
    },

    evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, value] of this.store.entries()) {
            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.store.delete(oldestKey);
        }
    },

    getStats(): { hits: number; misses: number; hitRate: number } {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0
        };
    }
};

// Clean up old cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of CACHE.store.entries()) {
        if (now - value.timestamp > CACHE.ttl) {
            CACHE.store.delete(key);
        }
    }
}, 1000 * 60 * 5); // Every 5 minutes

export async function POST(req: Request) {
    try {
        const { array } = await req.json();

        // Input validation
        if (!Array.isArray(array)) {
            return NextResponse.json({ error: "Input must be an array" }, { status: 400 });
        }
        
        if (array.length === 0) {
            return NextResponse.json({ error: "Input array cannot be empty" }, { status: 400 });
        }

        // Validate and normalize each item in array
        const validatedArray = array
            .map(item => {
                if (typeof item !== 'string') {
                    return String(item);
                }
                return item.trim();
            })
            .filter(item => item.length > 0);

        if (validatedArray.length === 0) {
            return NextResponse.json({ error: "No valid items in input array" }, { status: 400 });
        }

        // Create cache key
        const cacheKey = validatedArray.join('|');
        
        // Check cache first
        const cached = CACHE.get(cacheKey);
        if (cached) {
            return NextResponse.json({ result: cached });
        }

        const requestBody = {
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            prompt: `You are a context analyzer. Extract and structure key information from input into a concise format. Focus on: 1) Main topics 2) Key entities 3) Important relationships 4) Temporal information. Format as a structured JSON-like object for efficient parsing.

Input:
${validatedArray.join("\n")}

Response:`,
            max_tokens: 256,
            temperature: 0.2,
            top_p: 0.1,
            top_k: 40,
            repetition_penalty: 1.1,
            stop: ["}"],
            stream: false
        };

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
            return NextResponse.json({ 
                error: `API Error: ${error.error?.message || JSON.stringify(error)}` 
            }, { status: 500 });
        }

        const data = await response.json();

        // Handle different possible response formats
        let result;
        if (data.output?.text) {
            result = data.output.text;
        } else if (data.choices?.[0]?.text) {
            result = data.choices[0].text;
        } else if (data.choices?.[0]?.message?.content) {
            result = data.choices[0].message.content;
        } else if (typeof data.text === 'string') {
            result = data.text;
        } else {
            return NextResponse.json({ 
                error: "Invalid response format from API - no text content found" 
            }, { status: 500 });
        }

        // Cache the result
        CACHE.set(cacheKey, result);

        return NextResponse.json({ result });
    } catch (error) {
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : "Internal server error" 
        }, { status: 500 });
    }
} 