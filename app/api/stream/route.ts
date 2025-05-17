import { NextResponse } from 'next/server';
import { main } from '@/app/api/gpt';

export const runtime = 'edge';

// Rate limiting configuration
const RATE_LIMIT = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    store: new Map<string, { count: number; resetTime: number }>()
};

// Clean up old rate limit entries
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of RATE_LIMIT.store.entries()) {
        if (now > value.resetTime) {
            RATE_LIMIT.store.delete(key);
        }
    }
}, 60 * 1000);

export async function POST(req: Request) {
    try {
        // Rate limiting
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const now = Date.now();

        const rateLimit = RATE_LIMIT.store.get(ip) || { count: 0, resetTime: now + RATE_LIMIT.windowMs };
        
        if (rateLimit.resetTime < now) {
            rateLimit.count = 0;
            rateLimit.resetTime = now + RATE_LIMIT.windowMs;
        }

        if (rateLimit.count >= RATE_LIMIT.maxRequests) {
            return NextResponse.json({ 
                error: 'Too many requests, please try again later' 
            }, { 
                status: 429,
                headers: {
                    'Retry-After': Math.ceil((rateLimit.resetTime - now) / 1000).toString()
                }
            });
        }

        rateLimit.count++;
        RATE_LIMIT.store.set(ip, rateLimit);

        // Parse request body
        const { prompt, messages } = await req.json();
        
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Get training data with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const trainingResponse = await fetch(new URL('/api/train', req.url), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    array: ["hello", ...messages.map((msg: { text: string; type: string }) => msg.text), prompt]
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!trainingResponse.ok) {
                const error = await trainingResponse.json();
                throw new Error(error.error || 'Training failed');
            }

            const { result: trained } = await trainingResponse.json();

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        // Get the response with token streaming
                        const result = await main(prompt, trained, (token: string) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                        });
                        
                        // Send the final message
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result })}\n\n`));
                        controller.close();
                    } catch (error) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                            error: error instanceof Error ? error.message : 'An error occurred' 
                        })}\n\n`));
                        controller.close();
                    }
                }
            });

            return new NextResponse(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no',
                },
            });
        } catch (error) {
            clearTimeout(timeout);
            if (error instanceof Error && error.name === 'AbortError') {
                return NextResponse.json({ error: 'Training request timed out' }, { status: 504 });
            }
            throw error;
        }
    } catch (error) {
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Internal server error' 
        }, { status: 500 });
    }
} 