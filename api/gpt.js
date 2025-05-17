import dotenv from "dotenv";
dotenv.config();

const TOGETHER_API_KEY = '836797eb067da841183721c381d57a6bc75db1c876528161dd7a57d5e34a1393';

// Memory system for storing context
const memorySystem = {
    cache: new Map(),
    maxSize: 100,
    ttl: 1000 * 60 * 60, // 1 hour

    // Add to memory
    add(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
        this.cleanup();
    },

    // Get from memory
    get(key) {
        const item = this.cache.get(key);
        if (item && Date.now() - item.timestamp < this.ttl) {
            return item.value;
        }
        return null;
    },

    // Cleanup old entries
    cleanup() {
        if (this.cache.size > this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }
};

if (!TOGETHER_API_KEY) {
    throw new Error("TOGETHER_API_KEY is not defined in environment variables");
}

export async function main(prompt, trained, onToken) {
    try {
        // Input validation
        if (typeof prompt !== 'string') {
            throw new Error("Prompt must be a string");
        }

        prompt = prompt.trim();
        if (prompt.length === 0) {
            throw new Error("Prompt cannot be empty");
        }

        if (typeof trained !== 'string') {
            throw new Error("Trained context must be a string");
        }

        trained = trained.trim();
        if (trained.length === 0) {
            throw new Error("Trained context cannot be empty");
        }

        // Create memory key
        const memoryKey = `${prompt}|${trained}`;
        
        // Check memory first
        const cached = memorySystem.get(memoryKey);
        if (cached) {
            return cached;
        }

        const requestBody = {
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            prompt: `You are a context-aware assistant. Use the provided context to give accurate, relevant responses. Maintain consistency with previous interactions and focus on the most important information.

Context:
${trained}

User Query:
${prompt}

Response:`,
            max_tokens: 256,
            temperature: 0.2,
            top_p: 0.1,
            top_k: 40,
            repetition_penalty: 1.1,
            stop: ["</response>", "END"],
            stream: true
        };

        console.log("Sending request to Together API...");
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
            console.error("API Error Details:", error);
            throw new Error(`API Error: ${error.error?.message || JSON.stringify(error)}`);
        }

        if (!response.body) {
            throw new Error("ReadableStream not supported");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices?.[0]?.text) {
                            const token = data.choices[0].text;
                            fullResponse += token;
                            // Send the token using the callback
                            if (typeof onToken === 'function') {
                                onToken(token);
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            }
        }

        // Store in memory
        memorySystem.add(memoryKey, fullResponse);

        return fullResponse;
    } catch (error) {
        console.error("Inference error:", error.message);
        throw error;
    }
}
