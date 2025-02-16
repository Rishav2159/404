"use client";
import { motion } from "framer-motion";
import { TypingAnimation } from "@/components/magicui/typing-animation";

export default function About() {
  return (
    <motion.div 
      className="bg-zinc-950 min-h-screen pt-20 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <TypingAnimation className="text-4xl font-bold text-zinc-300 mb-4">
            Technical Documentation
          </TypingAnimation>
          <div className="w-24 h-1 bg-zinc-700 mx-auto"></div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-zinc-900 p-8 rounded-lg shadow-2xl border border-zinc-800"
        >
          <div className="space-y-6 font-mono text-zinc-400">
            <div>
              <h2 className="text-lg md:text-xl text-zinc-300 mb-2">[PROJECT OVERVIEW]</h2>
              <p className="text-sm md:text-base">404-Intelligence-Not-Found represents a unique approach to AI interaction, deliberately designed to challenge traditional machine learning paradigms. By implementing complete memory erasure between sessions, we explore the boundaries of contextless intelligence.</p>
            </div>

            <div>
              <h2 className="text-lg md:text-xl text-zinc-300 mb-2">[AI MODELS DEPLOYED]</h2>
              <div className="space-y-4">
                <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                  <h3 className="text-zinc-300 text-sm md:text-base">Mistral-Small</h3>
                  <ul className="list-disc pl-5 mt-2 text-sm md:text-base">
                    <li>Optimized for rapid response generation</li>
                    <li>3B parameter architecture</li>
                    <li>Specialized in concise, accurate outputs</li>
                    <li>Low latency inference</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                  <h3 className="text-zinc-300 text-sm md:text-base">Ministral-3B</h3>
                  <ul className="list-disc pl-5 mt-2 text-sm md:text-base">
                    <li>Enhanced context understanding</li>
                    <li>3B parameter foundation model</li>
                    <li>Robust reasoning capabilities</li>
                    <li>Efficient resource utilization</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg md:text-xl text-zinc-300 mb-2">[TECHNICAL ARCHITECTURE]</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base">
                <li>Frontend: Next.js 14 with React Server Components</li>
                <li>Styling: TailwindCSS with custom animations</li>
                <li>Motion: Framer Motion for fluid transitions</li>
                <li>State Management: React Hooks with local storage integration</li>
                <li>AI Integration: Dual model pipeline with fallback support</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg md:text-xl text-zinc-300 mb-2">[CORE CAPABILITIES]</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base">
                <li>Multi-model inference with automatic failover</li>
                <li>Real-time response generation with zero context dependency</li>
                <li>Secure data handling with immediate post-processing cleanup</li>
                <li>Dynamic model selection based on query complexity</li>
                <li>Cross-model response validation</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg md:text-xl text-zinc-300 mb-2">[SYSTEM METRICS]</h2>
              <div className="grid grid-cols-2 gap-4 text-sm md:text-base">
                <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                  <p className="text-zinc-500">Response Latency</p>
                  <p className="text-green-500">{"<"}500ms</p>
                </div>
                <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                  <p className="text-zinc-500">Memory Utilization</p>
                  <p className="text-blue-500">0.0 MB</p>
                </div>
                <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                  <p className="text-zinc-500">Token Processing</p>
                  <p className="text-yellow-500">4K/request</p>
                </div>
                <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                  <p className="text-zinc-500">Model Switch Time</p>
                  <p className="text-purple-500">50ms</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg md:text-xl text-zinc-300 mb-2">[RESEARCH IMPLICATIONS]</h2>
              <p className="text-sm md:text-base">This project explores the potential of multi-model stateless AI systems, challenging the assumption that accumulated knowledge is necessary for meaningful interaction. By leveraging both Mistral-Small and Ministral-3B, we achieve robust performance while maintaining zero-state architecture, suggesting new possibilities in ephemeral intelligence and privacy-first AI design.</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-8 text-center text-zinc-600 font-mono"
        >
          <p>BUILD: 1.0.0-experimental</p>
          <p>ENVIRONMENT: production</p>
          <p>LAST DEPLOYMENT: 2025</p>
        </motion.div>
      </div>
    </motion.div>
  );
}


