"use client"
import dotenv from "dotenv";

dotenv.config();

const TOGETHER_API_KEY = "836797eb067da841183721c381d57a6bc75db1c876528161dd7a57d5e34a1393";

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

export async function trainmachine(array) {
    try {
        // Input validation
        if (!Array.isArray(array)) {
            throw new Error("Input must be an array");
        }
        
        if (array.length === 0) {
            throw new Error("Input array cannot be empty");
        }

        // Validate each item in array
        array = array.map(item => {
            if (typeof item !== 'string') {
                return String(item);
            }
            return item.trim();
        }).filter(item => item.length > 0);

        if (array.length === 0) {
            throw new Error("No valid items in input array");
        }

        // Create memory key
        const memoryKey = array.join("|");
        
        // Check memory first
        const cached = memorySystem.get(memoryKey);
        if (cached) {
            return cached;
        }

        const requestBody = {
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            prompt: `You are a context analyzer. Extract and structure key information from input into a concise format. Focus on: 1) Main topics 2) Key entities 3) Important relationships 4) Temporal information. Format as a structured JSON-like object for efficient parsing.

Input:
${array.join("\n")}

Response:`,
            max_tokens: 256,
            temperature: 0.2,
            top_p: 0.1,
            top_k: 40,
            repetition_penalty: 1.1,
            stop: ["}"],
            stream: false
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

        const data = await response.json();
        console.log("API Response:", data); // Debug log

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
            console.error("Unexpected API Response Format:", data);
            throw new Error("Invalid response format from API - no text content found");
        }

        // Store in memory
        memorySystem.add(memoryKey, result);

        return result;
    } catch (error) {
        console.error("Training error:", error.message);
        throw error;
    }
}
