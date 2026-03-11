"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Rubik_Glitch } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const rubikGlitch = Rubik_Glitch({ weight: "400", subsets: ['latin'] });

type ModelMode = 'quality' | 'fast';
interface Message { text: string; type: 'user' | 'ai'; responseTime?: number }
interface SavedChat { id: string; title: string; messages: Message[]; timestamp: number; model: ModelMode }

const SUGGESTIONS = [
    { icon: "💡", text: "Explain quantum computing in simple terms" },
    { icon: "🐍", text: "Write a Python script to scrape a website" },
    { icon: "📝", text: "Help me write a professional email" },
    { icon: "🎨", text: "Generate CSS for a glassmorphism card" },
];

/* ──────────── PROMPT COMPONENT ──────────── */
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    /* ── Load saved chats from localStorage ── */
    useEffect(() => {
        const saved = localStorage.getItem("savedChats");
        if (saved) { try { setSavedChats(JSON.parse(saved)); } catch { /* skip */ } }
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'auto'
        });
    }, [messages, currentStreamingMessage]);

    /* ── Keyboard Shortcuts ── */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'n') { e.preventDefault(); handleNewChat(); }
            if (e.ctrlKey && e.shiftKey && e.key === 'S') { e.preventDefault(); if (messages.length > 0) exportChat(); }
            if (e.ctrlKey && e.key === '/') { e.preventDefault(); setShowSystemPrompt(prev => !prev); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    });

    /* ── Save chat to history ── */
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
            const updated = [chat, ...filtered].slice(0, 20); // Keep last 20
            localStorage.setItem("savedChats", JSON.stringify(updated));
            return updated;
        });
        setActiveChatId(chat.id);
    }, [activeChatId, model]);

    /* ── Load a saved chat ── */
    const loadChat = (chat: SavedChat) => {
        setMessages(chat.messages);
        setModel(chat.model);
        setActiveChatId(chat.id);
        setCurrentStreamingMessage("");
    };

    /* ── Delete a saved chat ── */
    const deleteChat = (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        setSavedChats(prev => {
            const updated = prev.filter(c => c.id !== chatId);
            localStorage.setItem("savedChats", JSON.stringify(updated));
            return updated;
        });
        if (activeChatId === chatId) { setActiveChatId(null); setMessages([]); }
    };

    /* ── API Call ── */
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

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                for (const line of chunk.split('\n').filter(l => l.trim())) {
                    if (line.startsWith('data: ')) {
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

    /* ── Submit ── */
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!prompt.trim() || isLoading) return;
        const userMessage: Message = { text: prompt, type: 'user' };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setPrompt("");
        await sendMessage(prompt, updatedMessages);
    };

    /* ── Suggestion click ── */
    const handleSuggestion = (text: string) => {
        setPrompt(text);
        setTimeout(() => {
            const userMessage: Message = { text, type: 'user' };
            const updatedMessages = [userMessage];
            setMessages(updatedMessages);
            setPrompt("");
            sendMessage(text, updatedMessages);
        }, 50);
    };

    /* ── Regenerate ── */
    const handleRegenerate = async (index: number) => {
        if (isLoading) return;
        const userMsgIndex = index - 1;
        if (userMsgIndex < 0 || messages[userMsgIndex]?.type !== 'user') return;
        
        const userPrompt = messages[userMsgIndex].text;
        const historyBefore = messages.slice(0, userMsgIndex);
        
        // Remove the AI message we are regenerating and keep the user message that prompted it
        const updatedMessages = [...historyBefore, { text: userPrompt, type: 'user' as const }];
        setMessages(updatedMessages);
        
        await sendMessage(userPrompt, updatedMessages, true);
    };

    /* ── Copy / Export ── */
    const copyToClipboard = async (text: string, index?: number) => {
        try {
            await navigator.clipboard.writeText(text);
            if (index !== undefined) { setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000); }
        } catch { /* skip */ }
    };

    const exportChat = () => {
        const md = messages.map(m => `### ${m.type === 'user' ? 'You' : '404 Intelligence'}\n\n${m.text}${m.responseTime ? `\n\n*Response time: ${m.responseTime.toFixed(1)}s*` : ''}`).join('\n\n---\n\n');
        const blob = new Blob([`# Chat Export — 404 Intelligence\n\n${md}`], { type: 'text/markdown' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `404-chat-${new Date().toISOString().slice(0, 10)}.md`; a.click();
    };

    /* ── New Chat ── */
    const handleNewChat = () => { setMessages([]); setCurrentStreamingMessage(""); setPrompt(""); setActiveChatId(null); };

    /* ── Voice Input ── */
    const toggleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert('Voice input is not supported in this browser. Try Chrome.');
            return;
        }
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    /* ── Markdown Renderer ── */
    const MarkdownContent = ({ content }: { content: string }) => (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                if (match) {
                    return (
                        <div className="my-3 rounded-lg overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid var(--border-subtle)' }}>
                            <div className="flex items-center justify-between px-4 py-2 text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                                <span>{match[1]}</span>
                                <button onClick={() => copyToClipboard(codeString)} className="flex items-center gap-1.5 hover:text-white transition-colors" style={{ color: 'var(--text-muted)' }}>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                                    Copy
                                </button>
                            </div>
                            <SyntaxHighlighter language={match[1]} style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '0.85rem' }}>{codeString}</SyntaxHighlighter>
                        </div>
                    );
                }
                return <code className="px-1.5 py-0.5 rounded text-sm" style={{ background: 'var(--bg-elevated)', color: '#e06c75' }} {...props}>{children}</code>;
            },
            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
            h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4" style={{ color: 'var(--text-primary)' }}>{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3" style={{ color: 'var(--text-primary)' }}>{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3" style={{ color: 'var(--text-primary)' }}>{children}</h3>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>{children}</a>,
            blockquote: ({ children }) => <blockquote className="border-l-2 pl-4 my-3 italic" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{children}</blockquote>,
            table: ({ children }) => <div className="overflow-x-auto my-3"><table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>{children}</table></div>,
            th: ({ children }) => <th className="text-left px-3 py-2 font-semibold text-sm" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{children}</th>,
            td: ({ children }) => <td className="px-3 py-2 text-sm" style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{children}</td>,
        }}>{content}</ReactMarkdown>
    );

    /* ── Message Bubble ── */
    const MessageBubble = ({ message, index }: { message: Message; index: number }) => (
        <div className="py-3 md:py-5 px-3 md:px-0 group">
            <div className="max-w-3xl mx-auto flex gap-4">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5"
                    style={{ background: message.type === 'user' ? 'var(--bg-surface)' : 'var(--accent)', color: message.type === 'user' ? 'var(--text-secondary)' : 'white' }}>
                    {message.type === 'user' ? 'U' : '4'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                            {message.type === 'user' ? 'You' : `404 Intelligence · ${model === 'quality' ? 'Quality' : 'Fast'}`}
                        </p>
                        {message.responseTime && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                                {message.responseTime.toFixed(1)}s
                            </span>
                        )}
                    </div>
                    <div className="text-[15px]" style={{ color: 'var(--text-primary)' }}>
                        {message.type === 'ai' ? <MarkdownContent content={message.text} /> : <p className="whitespace-pre-wrap">{message.text}</p>}
                    </div>
                    {message.type === 'ai' && (
                        <div className={`flex items-center gap-1 mt-2 transition-opacity duration-200 ${index === messages.length - 1 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button onClick={() => copyToClipboard(message.text, index)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                                style={{ color: copiedIndex === index ? 'var(--accent)' : 'var(--text-faint)' }}>
                                {copiedIndex === index ? (
                                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Copied</>
                                ) : (
                                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>Copy</>
                                )}
                            </button>
                            <button onClick={() => handleRegenerate(index)} disabled={isLoading}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors disabled:opacity-30"
                                style={{ color: 'var(--text-faint)' }}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
                                Regenerate
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    /* ──────────── RENDER ──────────── */
    return (
        <div className="flex flex-col min-h-screen">
            {/* ── Toolbar ── */}
            {messages.length > 0 && (
                <div className="sticky top-0 z-10 flex items-center justify-between px-3 md:px-4 py-1.5 md:py-2" style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={handleNewChat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                New Chat
                            </button>
                            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                                {(['quality', 'fast'] as ModelMode[]).map(m => (
                                    <button key={m} onClick={() => setModel(m)} className="px-3 py-1.5 text-xs font-medium transition-colors"
                                        style={{ background: model === m ? 'var(--accent)' : 'var(--bg-surface)', color: model === m ? 'white' : 'var(--text-muted)' }}>
                                        {m === 'quality' ? '⚡ Quality' : '🚀 Fast'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowSystemPrompt(!showSystemPrompt)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                style={{ color: systemPrompt ? 'var(--accent)' : 'var(--text-muted)', background: 'var(--bg-surface)' }}>
                                ⚙ System
                            </button>
                            <button onClick={exportChat} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)' }}>
                                ↓ Export
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── System Prompt Panel ── */}
            <AnimatePresence>
                {showSystemPrompt && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <div className="max-w-3xl mx-auto px-4 py-3">
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Custom System Prompt <span className="kbd ml-2">Ctrl+/</span></label>
                            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                                placeholder="e.g., Act as a senior Python developer. Be very concise."
                                className="input-field w-full px-3 py-2.5 text-sm" rows={2} style={{ resize: 'vertical' }} />
                            <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
                                {systemPrompt ? 'Custom prompt active. Applies to next message.' : 'Empty = default 404 Intelligence persona.'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Chat History Sidebar (inside chat area on mobile, below navbar on desktop) ── */}
            {messages.length === 0 && savedChats.length > 0 && (
                <div className="max-w-3xl mx-auto w-full px-4 pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="section-label">Recent Chats</p>
                        <button onClick={() => { setSavedChats([]); localStorage.removeItem("savedChats"); }}
                            className="text-[10px] px-2 py-0.5 rounded" style={{ color: 'var(--text-faint)' }}>Clear all</button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {savedChats.slice(0, 6).map(chat => (
                            <button key={chat.id} onClick={() => loadChat(chat)}
                                className="flex-shrink-0 text-left px-3 py-2 rounded-lg text-xs max-w-[200px] transition-all"
                                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                <p className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{chat.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span style={{ color: 'var(--text-faint)' }}>{chat.messages.length} msgs</span>
                                    <span style={{ color: 'var(--text-faint)' }}>·</span>
                                    <span style={{ color: 'var(--text-faint)' }}>{new Date(chat.timestamp).toLocaleDateString()}</span>
                                    <button onClick={(e) => deleteChat(e, chat.id)} className="ml-auto" style={{ color: 'var(--text-faint)' }}>×</button>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Empty State ── */}
            {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <h1 className={`${rubikGlitch.className} text-6xl md:text-7xl mb-3`} style={{ color: 'var(--text-primary)' }}>404</h1>
                        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Intelligence Not Found</p>
                        <p className="text-sm mt-2" style={{ color: 'var(--text-faint)' }}>Ask me anything. I won&apos;t remember it.</p>
                    </motion.div>

                    {/* Controls */}
                    <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                            {(['quality', 'fast'] as ModelMode[]).map(m => (
                                <button key={m} onClick={() => setModel(m)} className="px-4 py-2 text-sm font-medium transition-colors"
                                    style={{ background: model === m ? 'var(--accent)' : 'var(--bg-surface)', color: model === m ? 'white' : 'var(--text-muted)' }}>
                                    {m === 'quality' ? '⚡ Quality (70B)' : '🚀 Fast (8B)'}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowSystemPrompt(!showSystemPrompt)} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{ color: systemPrompt ? 'var(--accent)' : 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                            ⚙ Custom Prompt
                        </button>
                    </motion.div>

                    {/* Suggestion Chips */}
                    <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        {SUGGESTIONS.map((s, i) => (
                            <button key={i} className="suggestion-chip" onClick={() => handleSuggestion(s.text)}>
                                <span className="text-lg mr-2">{s.icon}</span>
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.text}</span>
                            </button>
                        ))}
                    </motion.div>

                    {/* Keyboard shortcuts hint */}
                    <motion.div className="flex items-center gap-4 mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                            <span className="kbd">Ctrl+N</span> New Chat
                        </span>
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                            <span className="kbd">Ctrl+/</span> System Prompt
                        </span>
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                            <span className="kbd">Ctrl+Shift+S</span> Export
                        </span>
                    </motion.div>
                </div>
            )}

            {/* ── Chat Messages ── */}
            {messages.length > 0 && (
                <div ref={chatContainerRef} className="flex-1 overflow-auto">
                    {messages.map((message, index) => (
                        <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
                            style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <MessageBubble message={message} index={index} />
                        </motion.div>
                    ))}
                    {isLoading && currentStreamingMessage && (
                        <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <div className="py-3 md:py-5 px-3 md:px-0">
                                <div className="max-w-3xl mx-auto flex gap-4">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5" style={{ background: 'var(--accent)', color: 'white' }}>4</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>404 Intelligence · {model === 'quality' ? 'Quality' : 'Fast'}</p>
                                        <div className="text-[15px]" style={{ color: 'var(--text-primary)' }}><MarkdownContent content={currentStreamingMessage} /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {isLoading && !currentStreamingMessage && (
                        <div className="py-4 md:py-6 px-3 md:px-0">
                            <div className="max-w-3xl mx-auto flex gap-4">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: 'var(--accent)', color: 'white' }}>4</div>
                                <div className="flex items-center gap-1.5 pt-2">
                                    <div className="loading-dot" style={{ animationDelay: '0s' }} />
                                    <div className="loading-dot" style={{ animationDelay: '0.2s' }} />
                                    <div className="loading-dot" style={{ animationDelay: '0.4s' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Input Area ── */}
            <div className="sticky bottom-0 px-2 md:px-4 py-2 md:py-4" style={{ background: 'var(--bg-primary)' }}>
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                    <div className="flex items-end rounded-3xl px-4 md:px-5 py-2 md:py-3 transition-all duration-200"
                        style={{ background: 'var(--bg-surface)', border: '2px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                        <textarea id="chat-input" value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                            placeholder="Type here....."
                            className="flex-1 bg-transparent text-[15px] resize-none focus:outline-none py-1"
                            rows={1} style={{ minHeight: '24px', maxHeight: '150px', color: 'var(--text-primary)' }} />

                        {/* Voice input button */}
                        <button type="button" onClick={toggleVoiceInput}
                            className={`ml-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${isListening ? 'voice-active' : ''}`}
                            style={{ background: isListening ? '#ef4444' : 'transparent', color: isListening ? 'white' : 'var(--text-faint)' }}
                            title="Voice input">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                            </svg>
                        </button>

                        {/* Send button */}
                        <button id="send-button" type="submit" disabled={isLoading || !prompt.trim()}
                            className="ml-1 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-30"
                            style={{ background: prompt.trim() ? 'var(--accent)' : 'var(--bg-elevated)', color: prompt.trim() ? 'white' : 'var(--text-faint)' }}>
                            {isLoading ? (
                                <motion.div className="w-4 h-4 rounded-full" style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                                    animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" /></svg>
                            )}
                        </button>
                    </div>
                    <p className="text-center text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
                        404 Intelligence has no memory. Every conversation starts fresh.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Prompt;
