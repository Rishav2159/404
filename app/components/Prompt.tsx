"use client";
import { useState, useEffect, useRef } from "react";
import { main } from "../../api/gpt";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { Doto } from "next/font/google";
import { Rubik_Glitch } from "next/font/google";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
const doto = Doto({ subsets: ['latin'] });
const rubikGlitch = Rubik_Glitch({ weight: "400", subsets: ['latin'] });
import { trainmachine } from "../../api/trainmachine";

// Function to detect code blocks in text
const detectCodeBlocks = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        // Add text before code block
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: text.slice(lastIndex, match.index)
            });
        }

        // Add code block
        parts.push({
            type: 'code',
            language: match[1] || 'plaintext',
            content: match[2].trim()
        });

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push({
            type: 'text',
            content: text.slice(lastIndex)
        });
    }

    return parts.length ? parts : [{ type: 'text', content: text }];
};

const Prompt = () => {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<{ text: string; type: 'user' | 'ai' }[]>([]); // Message pairs
    const [currentStreamingMessage, setCurrentStreamingMessage] = useState("");
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Clear localStorage when the component mounts (on page reload)
    useEffect(() => {
        localStorage.removeItem("chatHistory"); // Clear chat history from localStorage on reload
        setMessages([]); // Set messages to an empty array to reset the chat
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, currentStreamingMessage]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        
        const userMessage = { text: prompt, type: 'user' as const };
        setMessages(prev => [...prev, userMessage]);
        setPrompt(""); // Clear input immediately
        setIsLoading(true);
        setCurrentStreamingMessage("");

        try {
            const response = await fetch('/api/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                },
                body: JSON.stringify({
                    prompt,
                    messages: messages.map(msg => ({ text: msg.text, type: msg.type }))
                }),
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Network response was not ok');
            }

            if (!response.body) {
                throw new Error('No response body available');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedMessage = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.token) {
                                accumulatedMessage += data.token;
                                setCurrentStreamingMessage(accumulatedMessage);
                            }
                            if (data.done) {
                                const aiMessage = { text: data.result, type: 'ai' as const };
                                setMessages(prev => [...prev, aiMessage]);
                                setCurrentStreamingMessage("");
                                localStorage.setItem("chatHistory", JSON.stringify([...messages, userMessage, aiMessage]));
                            }
                        } catch (e) {
                            console.error('Error parsing JSON:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error:", error);
            const errorMessage = { 
                text: error instanceof Error ? error.message : "An error occurred while processing your request.", 
                type: 'ai' as const 
            };
            setMessages(prev => [...prev, errorMessage]);
            setCurrentStreamingMessage("");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            await handleSubmit(e);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const renderMessageContent = (text: string) => {
        const parts = detectCodeBlocks(text);
        
        return parts.map((part, index) => {
            if (part.type === 'text') {
                return <div key={index} className="p-4 whitespace-pre-wrap break-words">{part.content.trim()}</div>;
            }
            
            return (
                <div key={index} className="relative group">
                    <div className="bg-zinc-900/90 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 text-zinc-400 text-sm">
                            <span>{part.language}</span>
                            <motion.button
                                onClick={() => copyToClipboard(part.content)}
                                className="p-1 rounded hover:bg-zinc-700/50 hover:text-white transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                            </motion.button>
                        </div>
                        <SyntaxHighlighter
                            language={part.language}
                            style={vscDarkPlus}
                            className="!m-0 !bg-transparent"
                            customStyle={{
                                margin: 0,
                                padding: '1rem',
                                background: 'transparent',
                            }}
                        >
                            {part.content.trim()}
                        </SyntaxHighlighter>
                    </div>
                </div>
            );
        });
    };

    return (
        <motion.main
            className="bg-zinc-950 flex min-h-screen flex-col items-center p-4 md:p-24 pt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Logo and 404 Message Section */}
            <div className="w-full max-w-4xl text-center mb-8">
                <h1 className={`${rubikGlitch.className} text-zinc-300 text-8xl`}>
                    404
                </h1>
                <TypingAnimation className={`${doto.className} text-zinc-300 text-2xl`}>
                    Intelligence Not Found!
                </TypingAnimation>
            </div>

            {/* Chat History and Input Section */}
            <div className={`w-full max-w-4xl space-y-8 ${messages.length === 0 ? 'flex-grow flex items-center justify-center' : ''}`}>
                {/* Chat History */}
                {messages.length > 0 && (
                    <div ref={chatContainerRef} className="space-y-4 overflow-auto h-[60vh] scrollbar-hide p-4">
                        {messages.map((message, index) => (
                            <motion.div
                                key={index}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <motion.div
                                    className={`max-w-2xl rounded-2xl ${
                                        message.type === 'user' 
                                        ? 'bg-blue-600/10 text-blue-100' 
                                        : 'bg-zinc-800/30 text-zinc-100'
                                    }`}
                                    initial={{ scale: 0.95 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {renderMessageContent(message.text)}
                                </motion.div>
                            </motion.div>
                        ))}
                        {isLoading && currentStreamingMessage && (
                            <motion.div 
                                className="flex justify-start mb-4"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="bg-zinc-800/30 text-zinc-100 rounded-2xl">
                                    {renderMessageContent(currentStreamingMessage)}
                                </div>
                            </motion.div>
                        )}
                        {isLoading && !currentStreamingMessage && (
                            <motion.div 
                                className="flex justify-start mb-4"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="bg-zinc-800/30 text-zinc-100 p-4 rounded-lg">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                        <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Form to submit prompt */}
                <motion.form
                    onSubmit={handleSubmit}
                    onKeyDown={handleKeyDown}
                    className={`flex items-center space-x-4 ${messages.length === 0 ? 'max-w-6xl mx-auto w-full' : ''}`}
                    initial={{ y: -20 }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="relative flex-1 group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                        <div className="relative flex items-center bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 group-hover:border-zinc-700 transition-all duration-300">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Ask me anything..."
                                className="w-full p-4 bg-transparent text-white placeholder-zinc-500 focus:outline-none resize-none font-mono rounded-2xl"
                                rows={1}
                                style={{ height: '3.5rem' }}
                            />
                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                className="h-full px-4 text-zinc-400 hover:text-white disabled:opacity-50 transition-all duration-200 flex items-center justify-center"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isLoading ? (
                                    <motion.div
                                        className="w-5 h-5 border-2 border-zinc-400 border-t-white rounded-full"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                ) : (
                                    <svg 
                                        className="w-5 h-5" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={2} 
                                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                                        />
                                    </svg>
                                )}
                            </motion.button>
                        </div>
                    </div>
                </motion.form>
            </div>
        </motion.main>
    );
};

export default Prompt;
