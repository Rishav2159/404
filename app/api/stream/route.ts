import { NextResponse } from 'next/server';
import { streamChat } from '@/app/api/gpt';

// Rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 30;

export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const now = Date.now();

        const rateLimit = rateLimitStore.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
        if (rateLimit.resetTime < now) { rateLimit.count = 0; rateLimit.resetTime = now + RATE_LIMIT_WINDOW; }

        if (rateLimit.count >= RATE_LIMIT_MAX) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait a moment and try again.' },
                { status: 429, headers: { 'Retry-After': Math.ceil((rateLimit.resetTime - now) / 1000).toString() } }
            );
        }

        rateLimit.count++;
        rateLimitStore.set(ip, rateLimit);
        if (rateLimitStore.size > 100) {
            for (const [key, value] of rateLimitStore.entries()) {
                if (now > value.resetTime) rateLimitStore.delete(key);
            }
        }

        const { prompt, messages = [], model, systemPrompt, isRegenerate } = await req.json();

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return NextResponse.json({ error: 'Please enter a message.' }, { status: 400 });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const result = await streamChat(prompt, messages, (token: string) => {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }, { model, systemPrompt, isRegenerate });

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result })}\n\n`));
                    controller.close();
                } catch (error) {
                    console.error("[stream] Error:", error);
                    const errorMsg = error instanceof Error ? error.message : 'An error occurred';
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
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
        console.error("[stream] Internal error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}