"use client";
import { useState, useEffect } from "react";
import { main } from "../../api/gpt";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { Doto } from "next/font/google";
import { Rubik_Glitch } from "next/font/google";
import { motion } from "framer-motion";
const doto = Doto({ subsets: ['latin'] });
const rubikGlitch = Rubik_Glitch({ weight: "400", subsets: ['latin'] });
import { trainmachine } from "../../api/trainmachine";

const Prompt = () => {
    const [prompt, setPrompt] = useState("");
    const [response, setResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<{ text: string; type: 'user' | 'ai' }[]>([]); // Message pairs

    // Clear localStorage when the component mounts (on page reload)
    useEffect(() => {
        localStorage.removeItem("chatHistory"); // Clear chat history from localStorage on reload
        setMessages([]); // Set messages to an empty array to reset the chat
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const updatedMessages = [...messages, { text: prompt, type: 'user' as const }];
            const trained = await trainmachine(["hello", ...updatedMessages.map(msg => msg.text)]);
            const result = await main(prompt, trained);

            const newMessage = { text: result || "No response", type: 'ai' as const };
            updatedMessages.push(newMessage);

            setMessages(updatedMessages);
            setResponse(result || "");
            localStorage.setItem("chatHistory", JSON.stringify(updatedMessages)); // Save messages

            setPrompt(""); // Reset input field
        } catch (error) {
            console.error("Error:", error);
            setResponse("An error occurred while processing your request.");
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
                <div className="space-y-4 overflow-auto h-[60vh] scrollbar-hide">
                    {messages.map((message, index) => (
                        <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-xs p-4 rounded-lg font-mono ${message.type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'}`}
                            >
                                {message.text}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Form to submit prompt */}
                <motion.form
                    onSubmit={handleSubmit}
                    onKeyDown={handleKeyDown}
                    className={`flex items-center space-x-2 ${messages.length === 0 ? 'max-w-6xl mx-auto' : ''}`}
                    initial={{ y: -20 }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Enter your prompt here..."
                        className="w-full p-4 border rounded font-mono bg-zinc-100 text-black"
                        rows={2}
                        style={{ height: '3rem' }} // Match height of button
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="p-4 bg-zinc-700 text-white rounded hover:bg-zinc-600 disabled:opacity-50"
                        style={{ height: '3rem' }} // Match height of text area
                    >
                        {isLoading ? "Processing..." : "Send"}
                    </button>
                </motion.form>
            </div>
        </motion.main>
    );
};

export default Prompt;
