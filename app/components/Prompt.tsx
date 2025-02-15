"use client";
import { useState} from "react";
import { main } from "../gpt";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { Doto } from "next/font/google";
import Image from "next/image";
const doto = Doto({ subsets: ['latin'] }); // Initialize the font

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
        console.log(process.env.NEXT_PUBLIC_GITHUB_TOKEN);
        const result = await main(prompt);
        setResponse(result || "");
        const updatedHistory = [...history, prompt];
        setHistory(updatedHistory);
        localStorage.setItem("promptHistory", JSON.stringify(updatedHistory));
      } catch (error) {
        console.error("Error:", error);
        setResponse("An error occurred while processing your request.");
      } finally {
        setIsLoading(false);
      }
    };
  
    return (
      <main className="bg-black flex min-h-screen flex-col items-center justify-between p-24">
        <div className="w-full max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image display option */}
            <div className="flex justify-center flex-col items-center">
              <Image src="/404logo.png" alt="Description of image" className="w-auto h-auto rounded-lg pd-8" />
              <TypingAnimation className={`${doto.className} text-white`}>Intelligence Not Found!</TypingAnimation>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              className="w-full p-4 border rounded-lg font-mono text-black"
              rows={4}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Submit"}
            </button>
          </form>
  
          {response && (
            <div className="mt-8 p-4 border rounded-lg">
              <h2 className="text-xl font-bold mb-2 text-white">Response:</h2>
              <p className="whitespace-pre-wrap font-mono text-white">{response}</p>
            </div>
          )}
  
          {/* Displaying the history of prompts */}
          {/* <div className="mt-8">
            <h2 className="text-xl font-bold mb-2">Previous Questions:</h2>
            <ul className="list-disc pl-5">
              {history.map((item, index) => (
                <li key={index} className="font-mono">
                  {item}
                </li>
              ))}
            </ul>
          </div> */}
        </div>
      </main>
    );
};

export default Prompt;
