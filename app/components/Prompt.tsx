"use client";
import { useState} from "react";
import { main } from "../../api/gpt";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { Doto } from "next/font/google";
import { Rubik_Glitch } from "next/font/google";
import { motion } from "framer-motion";
const doto = Doto({ subsets: ['latin'] });
const rubikGlitch = Rubik_Glitch({ weight :"400", subsets: ['latin'] });
import { trainmachine } from "../../api/trainmachine";

const Prompt = () => {
    const [prompt, setPrompt] = useState("");
    const [response, setResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState<string[]>([]); // Initialize as empty array
// Only run on client mount

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
  
      try {
        const updatedHistory = Array.from(new Set([...history, prompt]));
        const trained = await trainmachine(["hello", ...updatedHistory]);
        const result = await main(prompt, trained);
        setResponse(result || "");
        setHistory(updatedHistory);
        localStorage.setItem("promptHistory", JSON.stringify(updatedHistory));
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
        className="bg-zinc-950 flex min-h-screen flex-col items-center justify-between p-4 md:p-24 pt-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-full max-w-2xl">
          <motion.form 
            onSubmit={handleSubmit} 
            onKeyDown={handleKeyDown} 
            className="space-y-4"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Image display option */}
            <div className="flex justify-center flex-col items-center mt-10">
              <h1 className={`${rubikGlitch.className} text-zinc-300 text-center text-8xl`}>404</h1>
              <TypingAnimation className={`${doto.className} text-zinc-300 text-center`}>Intelligence Not Found!</TypingAnimation>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              className="w-full p-4 border rounded font-mono bg-zinc-100 text-black"
              rows={4}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-4 bg-zinc-700  text-white rounded hover:bg-zinc-600 disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Submit"}
            </button>
          </motion.form>
  
          {response && (
            <motion.div 
              className="mt-8 p-4 border rounded-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-xl font-bold mb-2 text-white">Response:</h2>
              <p className="whitespace-pre-wrap font-mono text-white">{response}</p>
            </motion.div>
          )}
  
          {/* Displaying the history of prompts */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-2 text-zinc-300">Previous Questions:</h2>
            <ul className="list-disc pl-5 text-zinc-300">
              {history.length > 0 ? (
                history.filter(item => item !== "hello").map((item, index) => (
                  <li key={index} className="font-mono">
                    {item}
                  </li>
                ))
              ) : (
                <li className="font-mono text-gray-500">No previous questions.</li>
              )}
            </ul>
          </div>
        </div>
      </motion.main>
    );
};

export default Prompt;
