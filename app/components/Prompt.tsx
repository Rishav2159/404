"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type ModelMode = 'quality' | 'fast';
interface Message { text: string; type: 'user' | 'ai'; responseTime?: number }
interface SavedChat { id: string; title: string; messages: Message[]; timestamp: number; model: ModelMode }

const SUGGESTIONS = [
    { icon: "💡", text: "Explain quantum computing in simple terms" },
    { icon: "🐍", text: "Write a Python script to scrape a website" },
    { icon: "📝", text: "Help me write a professional email" },
    { icon: "🎨", text: "Generate CSS for a minimal card component" },
];

/* ===== MARKDOWN RENDERER (hoisted) ===== */
const MarkdownContent = ({ content, onCopy }: { content: string; onCopy: (code: string) => void }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                if (match) {
                    return (
                        <div className="my-4 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 text-xs"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                                <span className="font-mono">{match[1]}</span>
                                <button onClick={() => onCopy(codeString)}
                                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                                    style={{ color: 'var(--text-muted)' }}>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round"
                                            d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                    </svg>
                                    Copy
                                </button>
                            </div>
                            <SyntaxHighlighter language={match[1]} style={vscDarkPlus}
                                customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '0.825rem' }}
                                lineStyle={{ lineHeight: '1.6' }}>
                                {codeString}
                            </SyntaxHighlighter>
                        </div>
                    );
                }
                return (
                    <code className="px-1.5 py-0.5 rounded-md text-sm font-mono"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                        {...props}>
                        {children}
                    </code>
                );
            },
            p: ({ children }) => <p className="mb-4 last:mb-0 leading-[1.7] text-[15px]">{children}</p>,
            h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-5" style={{ color: 'var(--text-primary)' }}>{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 mt-4" style={{ color: 'var(--text-primary)' }}>{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3" style={{ color: 'var(--text-primary)' }}>{children}</h3>,
            h4: ({ children }) => <h4 className="text-sm font-semibold mb-2 mt-3" style={{ color: 'var(--text-primary)' }}>{children}</h4>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1.5">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</strong>,
            em: ({ children }) => <em className="italic" style={{ color: 'var(--text-secondary)' }}>{children}</em>,
            a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer"
                className="underline decoration-dotted decoration-1"
                style={{ color: 'var(--text-secondary)' }}>{children}</a>,
            blockquote: ({ children }) =>
                <blockquote className="border-l-2 pl-4 my-4 italic"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{children}</blockquote>,
            table: ({ children }) =>
                <div className="overflow-x-auto my-4 rounded-lg"
                    style={{ border: '1px solid var(--border-subtle)' }}>
                    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>{children}</table>
                </div>,
            th: ({ children }) =>
                <th className="text-left px-3 py-2 font-semibold text-xs"
                    style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', background: 'var(--bg-elevated)' }}>{children}</th>,
            td: ({ children }) =>
                <td className="px-3 py-2 text-sm"
                    style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{children}</td>,
        }}
    >
        {content}
    </ReactMarkdown>
);

/* ===== MESSAGE BUBBLE (hoisted) ===== */
interface MessageBubbleProps {
    message: Message;
    index: number;
    isLast: boolean;
    model: ModelMode;
    isLoading: boolean;
    copiedIndex: number | null;
    onCopy: (text: string, index?: number) => void;
    onRegenerate: (index: number) => void;
}

const MessageBubble = ({ message, index, isLast, model, isLoading, copiedIndex, onCopy, onRegenerate }: MessageBubbleProps) => {
    const isUser = message.type === 'user';
    return (
        <motion.div
            className="group mb-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
        >
            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                    relative max-w-[620px]
                    ${isUser
                        ? 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl rounded-tr-sm'
                        : 'bg-transparent'}
                `}>
                    {!isUser && (
                        <div
                            className="absolute -left-8 top-1 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                                background: 'var(--accent)',
                                color: 'var(--on-accent)',
                                border: '1px solid var(--border-subtle)'
                            }}
                        >
                            4
                        </div>
                    )}
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-2.5">
                            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                {isUser ? 'You' : '404 Intelligence'}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.25 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-faint)' }}>
                                {model === 'quality' ? 'Q' : 'F'}
                            </span>
                            {message.responseTime && (
                                <span className="text-[9px] px-1.5 py-0.25 rounded" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                                    {message.responseTime.toFixed(1)}s
                                </span>
                            )}
                        </div>

                        <div className="text-[15px] leading-[1.7]" style={{ color: 'var(--text-primary)' }}>
                            {isUser
                                ? <p className="whitespace-pre-wrap">{message.text}</p>
                                : <MarkdownContent content={message.text} onCopy={onCopy} />}
                        </div>

                        {isUser && (
                            <div className="absolute -right-1 -bottom-3 w-3 h-3 -rotate-45"
                                style={{ borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }} />
                        )}

                        {!isUser && isLast && (
                            <div className={`flex items-center gap-1 mt-3 transition-opacity duration-200 ${isLast ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <button onClick={() => onCopy(message.text, index)}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                                    style={{ color: copiedIndex === index ? 'var(--accent)' : 'var(--text-faint)', background: 'var(--bg-elevated)' }}>
                                    {copiedIndex === index
                                        ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> Copied</>
                                        : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg> Copy</>}
                                    </button>
                                    <button onClick={() => onRegenerate(index)} disabled={isLoading}
                                        className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors disabled:opacity-30"
                                        style={{ color: 'var(--text-faint)', background: 'var(--bg-elevated)' }}
                                        aria-label="Regenerate response">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                                        </svg>
                                        Regenerate
                                    </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const Prompt = () => {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentStreamingMessage, setCurrentStreamingMessage] = useState("");
    const [model, setModel] = useState<ModelMode>('quality');
    const [systemPrompt, setSystemPrompt] = useState("");
    const [showSystemPrompt, setShowSystemPrompt] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem("savedChats");
        if (saved) { try { setSavedChats(JSON.parse(saved)); } catch { /* skip */ } }
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, currentStreamingMessage, isLoading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
        }
    }, [prompt]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'n') { e.preventDefault(); handleNewChat(); }
            if (e.ctrlKey && e.shiftKey && e.key === 'S') { e.preventDefault(); if (messages.length > 0) exportChat(); }
            if (e.ctrlKey && e.key === '/') { e.preventDefault(); setShowSystemPrompt(prev => !prev); }
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); handleNewChat(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [messages.length]);

    const saveChatToHistory = useCallback((msgs: Message[]) => {
        if (msgs.length < 2) return;
        const chat: SavedChat = {
            id: activeChatId || Date.now().toString(),
            title: msgs[0]?.text.slice(0, 50) || 'New Chat',
            messages: msgs,
            timestamp: Date.now(),
            model,
        };
        setSavedChats(prev => {
            const filtered = prev.filter(c => c.id !== chat.id);
            const updated = [chat, ...filtered].slice(0, 20);
            localStorage.setItem("savedChats", JSON.stringify(updated));
            return updated;
        });
        setActiveChatId(chat.id);
    }, [activeChatId, model]);

    const loadChat = (chat: SavedChat) => {
        setMessages(chat.messages);
        setModel(chat.model);
        setActiveChatId(chat.id);
        setCurrentStreamingMessage("");
    };

    const deleteChat = (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        setSavedChats(prev => {
            const updated = prev.filter(c => c.id !== chatId);
            localStorage.setItem("savedChats", JSON.stringify(updated));
            return updated;
        });
        if (activeChatId === chatId) { setActiveChatId(null); setMessages([]); }
    };

    const sendMessage = useCallback(async (messageText: string, messageHistory: Message[], isRegenerate = false) => {
        setIsLoading(true);
        setCurrentStreamingMessage("");
        const startTime = Date.now();

        try {
            let finalSystemPrompt = systemPrompt || undefined;
            if (isRegenerate) {
                const regenInstruction = "IMPORTANT: The user just clicked 'Regenerate' because they were not fully satisfied with the previous response. You MUST provide a completely NEW, DIFFERENT, and ALTERNATIVE answer. Do NOT repeat the exact same points or structure. Change your perspective, tone, or approach entirely.";
                finalSystemPrompt = finalSystemPrompt ? `${finalSystemPrompt}\n\n${regenInstruction}` : regenInstruction;
            }

            const response = await fetch('/api/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                body: JSON.stringify({
                    prompt: messageText,
                    messages: messageHistory.map(msg => ({ text: msg.text, type: msg.type })),
                    model,
                    systemPrompt: finalSystemPrompt,
                    isRegenerate,
                }),
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Network response was not ok');
            }
            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedMessage = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ') || line.trim() === 'data: [DONE]') continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.error) throw new Error(data.error);
                        if (data.token) { accumulatedMessage += data.token; setCurrentStreamingMessage(accumulatedMessage); }
                        if (data.done) {
                            const elapsed = ((Date.now() - startTime) / 1000);
                            const aiMessage: Message = { text: data.result, type: 'ai', responseTime: elapsed };
                            const updatedMsgs = [...messageHistory, aiMessage];
                            setMessages(updatedMsgs);
                            setCurrentStreamingMessage("");
                            saveChatToHistory(updatedMsgs);
                        }
                    } catch (e) {
                        if (e instanceof Error && !e.message.includes('JSON')) throw e;
                    }
                }
            }
        } catch (error) {
            const elapsed = ((Date.now() - startTime) / 1000);
            const errMsg: Message = { text: error instanceof Error ? error.message : "An error occurred.", type: 'ai', responseTime: elapsed };
            setMessages(prev => [...prev, errMsg]);
            setCurrentStreamingMessage("");
        } finally {
            setIsLoading(false);
        }
    }, [model, systemPrompt, saveChatToHistory]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!prompt.trim() || isLoading) return;
        const userMessage: Message = { text: prompt, type: 'user' };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setPrompt("");
        await sendMessage(prompt, updatedMessages);
    };

    const handleSuggestion = (text: string) => {
        const userMessage: Message = { text, type: 'user' };
        const updatedMessages = [userMessage];
        setMessages(updatedMessages);
        setPrompt("");
        sendMessage(text, updatedMessages);
    };

    const handleRegenerate = async (index: number) => {
        if (isLoading) return;
        const userMsgIndex = index - 1;
        if (userMsgIndex < 0 || messages[userMsgIndex]?.type !== 'user') return;
        const userPrompt = messages[userMsgIndex].text;
        const historyBefore = messages.slice(0, userMsgIndex);
        const updatedMessages = [...historyBefore, { text: userPrompt, type: 'user' as const }];
        setMessages(updatedMessages);
        await sendMessage(userPrompt, updatedMessages, true);
    };

    const copyToClipboard = async (text: string, index?: number) => {
        try {
            await navigator.clipboard.writeText(text);
            if (index !== undefined) {
                setCopiedIndex(index);
                if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                copyTimeoutRef.current = setTimeout(() => setCopiedIndex(null), 2000);
            }
        } catch {
            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                if (index !== undefined) {
                    setCopiedIndex(index);
                    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                    copyTimeoutRef.current = setTimeout(() => setCopiedIndex(null), 2000);
                }
            } catch { /* skip */ }
        }
    };

    const exportChat = () => {
        const md = messages.map(m => `### ${m.type === 'user' ? 'You' : '404 Intelligence'}\n\n${m.text}${m.responseTime ? `\n\n*Response time: ${m.responseTime.toFixed(1)}s*` : ''}`).join('\n\n---\n\n');
        const blob = new Blob([`# Chat Export — 404 Intelligence\n\n${md}`], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `404-chat-${new Date().toISOString().slice(0, 10)}.md`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handleNewChat = () => { setMessages([]); setCurrentStreamingMessage(""); setPrompt(""); setActiveChatId(null); };

    const toggleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            console.warn('Voice input not supported');
            return;
        }
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }
        const win = window as any;
        const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
            setPrompt(transcript);
        };
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
    };

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        };
    }, []);

    const chatWindowClass = "mx-auto px-4";

    return (
        <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ minHeight: '100dvh' }}>
            {/* Toolbar */}
            {messages.length > 0 && (
                <div className="sticky top-16 md:top-0 z-20 glass flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="max-w-3xl mx-auto w-full flex items-center justify-between px-4 py-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <motion.button
                                onClick={handleNewChat}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                                style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                                aria-label="New chat"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span className="hidden sm:inline">New</span>
                            </motion.button>
                            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }} role="group" aria-label="Model selection">
                                {(['quality', 'fast'] as ModelMode[]).map(m => (
                                    <motion.button
                                        key={m}
                                        onClick={() => setModel(m)}
                                        className="px-3 py-2 text-xs font-medium transition-all"
                                        style={{
                                            background: model === m ? 'var(--accent)' : 'var(--bg-surface)',
                                            color: model === m ? 'var(--on-accent)' : 'var(--text-muted)'
                                        }}
                                        aria-pressed={model === m}
                                        whileTap={{ scale: 0.96 }}
                                    >
                                        {m === 'quality' ? 'Quality' : 'Fast'}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <motion.button
                                onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                                className="px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                                style={{ color: systemPrompt ? 'var(--accent)' : 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                                aria-pressed={showSystemPrompt} aria-label="Custom system prompt"
                                whileTap={{ scale: 0.96 }}
                            >
                                ⚙ System
                            </motion.button>
                            <motion.button
                                onClick={exportChat}
                                className="px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                                style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                                aria-label="Export chat as Markdown"
                                whileTap={{ scale: 0.96 }}
                            >
                                ↓ Export
                            </motion.button>
                        </div>
                    </div>
                </div>
            )}

            {/* System Prompt Panel */}
            <AnimatePresence>
                {showSystemPrompt && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden flex-shrink-0"
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                        <div className="max-w-3xl mx-auto px-4 py-4">
                            <label htmlFor="system-prompt" className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                                Custom System Prompt <span className="kbd ml-2">Ctrl+/</span>
                            </label>
                            <textarea
                                id="system-prompt"
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                placeholder="e.g., Act as a senior Python developer. Be very concise."
                                className="input-field w-full px-4 py-3 text-sm"
                                rows={2}
                                style={{ resize: 'vertical' }}
                            />
                            <p className="text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
                                {systemPrompt ? 'Custom prompt active. Applies to next message.' : 'Empty = default 404 Intelligence persona.'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Recent Chats */}
            {messages.length === 0 && savedChats.length > 0 && (
                <div className="max-w-3xl mx-auto w-full px-4 pt-6 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <p className="section-label">Recent Chats</p>
                        <button onClick={() => { setSavedChats([]); localStorage.removeItem("savedChats"); }}
                            className="text-[10px] px-2 py-1 rounded-lg" style={{ color: 'var(--text-faint)' }}>
                            Clear all
                        </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {savedChats.slice(0, 6).map(chat => (
                            <div key={chat.id}
                                className="flex-shrink-0 text-left px-4 py-3 rounded-xl text-xs max-w-[220px] transition-all surface-card flex flex-col">
                                <button onClick={() => loadChat(chat)}
                                    className="text-left truncate font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {chat.title}
                                </button>
                                <div className="flex items-center gap-1 mt-auto">
                                    <span style={{ color: 'var(--text-faint)' }}>{chat.messages.length} msgs</span>
                                    <span style={{ color: 'var(--text-faint)' }}>·</span>
                                    <span style={{ color: 'var(--text-faint)' }}>{new Date(chat.timestamp).toLocaleDateString()}</span>
                                    <button onClick={(e) => deleteChat(e, chat.id)} className="ml-auto" style={{ color: 'var(--text-faint)' }} aria-label="Delete chat">×</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-y-auto">
                    <motion.div className="text-center mb-10"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}>
                        <h1 className="text-6xl md:text-8xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>404</h1>
                        <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Intelligence Not Found</p>
                        <p className="text-sm mt-2" style={{ color: 'var(--text-faint)' }}>Ask me anything. I won&apos;t remember it.</p>
                    </motion.div>

                    <motion.div className="flex items-center gap-3 mb-8 flex-wrap justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.25 }}>
                        <div className="flex rounded-xl overflow-hidden shadow-md" style={{ border: '1px solid var(--border-subtle)' }} role="group" aria-label="Model selection">
                            {(['quality', 'fast'] as ModelMode[]).map(m => (
                                <motion.button
                                    key={m}
                                    onClick={() => setModel(m)}
                                    className="px-4 py-2.5 text-sm font-medium transition-all"
                                    style={{
                                        background: model === m ? 'var(--accent)' : 'var(--bg-surface)',
                                        color: model === m ? 'var(--on-accent)' : 'var(--text-muted)'
                                    }}
                                    aria-pressed={model === m}
                                    whileTap={{ scale: 0.96 }}
                                >
                                    {m === 'quality' ? 'Quality' : 'Fast'}
                                </motion.button>
                            ))}
                        </div>
                        <motion.button
                            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                            style={{ color: systemPrompt ? 'var(--accent)' : 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                            aria-pressed={showSystemPrompt} aria-label="Custom system prompt"
                            whileTap={{ scale: 0.96 }}
                        >
                            ⚙ Custom Prompt
                        </motion.button>
                    </motion.div>

                    <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}>
                        {SUGGESTIONS.map((s, i) => (
                            <motion.button key={i} className="suggestion-chip" onClick={() => handleSuggestion(s.text)} whileTap={{ scale: 0.98 }}>
                                <div className="flex items-center gap-3 relative z-10">
                                    <span className="text-xl">{s.icon}</span>
                                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.text}</span>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>

                    <motion.div className="flex items-center gap-4 mt-10 flex-wrap justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55 }}>
                        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                            <span className="kbd">Ctrl+K</span> New Chat
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                            <span className="kbd">Ctrl+/</span> System Prompt
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                            <span className="kbd">Ctrl+Shift+S</span> Export
                        </span>
                    </motion.div>
                </div>
            )}

            {/* Chat Messages */}
            {messages.length > 0 && (
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto" role="log" aria-live="polite" aria-label="Chat messages">
                    <div className="max-w-3xl mx-auto px-4 py-6">
                        {messages.map((message, index) => (
                            <MessageBubble
                                key={message.text + index}
                                message={message}
                                index={index}
                                isLast={index === messages.length - 1}
                                model={model}
                                isLoading={isLoading}
                                copiedIndex={copiedIndex}
                                onCopy={copyToClipboard}
                                onRegenerate={handleRegenerate}
                            />
                        ))}

                        {isLoading && currentStreamingMessage && (
                            <motion.div
                                className="mb-1"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                            >
                                <div className="flex justify-start">
                                    <div className="relative max-w-[620px]">
                                        <div
                                            className="absolute -left-8 top-1 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                                            style={{ background: 'var(--accent)', color: 'var(--on-accent)', border: '1px solid var(--border-subtle)' }}
                                        >
                                            4
                                        </div>
                                        <div className="px-5 py-4">
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>404 Intelligence</span>
                                                <span className="text-[9px] px-1.5 py-0.25 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-faint)' }}>
                                                    {model === 'quality' ? 'Q' : 'F'}
                                                </span>
                                            </div>
                                            <div className="text-[15px] leading-[1.7]" style={{ color: 'var(--text-primary)' }}>
                                                <MarkdownContent content={currentStreamingMessage} onCopy={copyToClipboard} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {isLoading && !currentStreamingMessage && (
                            <div className="py-4 md:py-6 px-3 md:px-0">
                                <div className="max-w-3xl mx-auto flex gap-4">
                                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>4</div>
                                    <div className="flex items-center gap-1.5 pt-2.5">
                                        <div className="loading-dot" style={{ animationDelay: '0s' }} />
                                        <div className="loading-dot" style={{ animationDelay: '0.2s' }} />
                                        <div className="loading-dot" style={{ animationDelay: '0.4s' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="sticky bottom-0 px-2 md:px-4 py-3 md:py-5 backdrop-blur-md flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)' }}>
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                    <div className="flex items-end gap-2 rounded-2xl px-3 md:px-4 py-2.5 md:py-3 transition-all duration-200"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                            placeholder="Message 404 Intelligence..."
                            className="flex-1 bg-transparent text-[15px] resize-none focus:outline-none py-1.5"
                            rows={1}
                            style={{ minHeight: '24px', maxHeight: '180px', color: 'var(--text-primary)' }}
                            aria-label="Message 404 Intelligence"
                        />

                        <motion.button
                            type="button"
                            onClick={toggleVoiceInput}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${isListening ? 'voice-active' : ''}`}
                            style={{ background: isListening ? 'var(--danger)' : 'var(--bg-elevated)', color: isListening ? 'white' : 'var(--text-faint)' }}
                            aria-label={isListening ? 'Stop voice input' : 'Voice input'}
                            aria-pressed={isListening}
                            title="Voice input"
                            whileTap={{ scale: 0.92 }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                            </svg>
                        </motion.button>

                        <motion.button
                            id="send-button"
                            type="submit"
                            disabled={isLoading || !prompt.trim()}
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30"
                            style={{ background: prompt.trim() ? 'var(--accent)' : 'var(--bg-elevated)', color: prompt.trim() ? 'var(--on-accent)' : 'var(--text-faint)', boxShadow: prompt.trim() ? '0 2px 8px var(--accent-glow)' : 'none' }}
                            aria-label={isLoading ? 'Sending...' : 'Send message'}
                            whileTap={{ scale: 0.92 }}
                        >
                            {isLoading ? (
                                <motion.div className="w-4 h-4 rounded-full"
                                    style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--on-accent)' }}
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                                </svg>
                            )}
                        </motion.button>
                    </div>
                    <p className="text-center text-[11px] mt-2.5" style={{ color: 'var(--text-faint)' }}>
                        404 Intelligence has no memory. Every conversation starts fresh.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Prompt;