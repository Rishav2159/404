"use client";
import { motion } from "framer-motion";

const models = [
  {
    name: "Mistral-Small",
    status: "Primary",
    statusColor: "var(--accent)",
    specs: [
      "High throughput logic routing",
      "32k base context window",
      "Optimized for concise, accurate outputs",
      "Low latency inference",
    ],
  },
  {
    name: "Ministral-3B",
    status: "Fallback",
    statusColor: "var(--text-muted)",
    specs: [
      "Enhanced context understanding",
      "3B parameter foundation model",
      "Robust reasoning capabilities",
      "Efficient resource utilization",
    ],
  },
];

const metrics = [
  { label: "Response Latency", value: "<500ms" },
  { label: "Memory Utilization", value: "0.0 MB" },
  { label: "Token Processing", value: "4K/request" },
  { label: "Model Switch Time", value: "50ms" },
];

const techStack = [
  "Next.js with React Server Components",
  "Tailwind CSS with custom design system",
  "Framer Motion for transitions",
  "React Hooks with local storage integration",
  "Dual model pipeline with fallback support",
];

export default function About() {
  return (
    <div className="min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            About 404 Intelligence
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            A unique approach to AI interaction — designed with complete memory erasure between sessions.
            Every conversation starts from zero.
          </p>
        </motion.div>

        {/* Overview */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="section-label mb-3">Overview</h2>
          <div className="surface-card p-5">
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              404 Intelligence represents a deliberate challenge to traditional machine learning paradigms.
              By implementing complete memory erasure between sessions, the system operates without persistent
              conversational buffers or vector databases. Each query-response cycle is completely isolated,
              ensuring zero data retention — simulating a pure, stateless consciousness loop.
            </p>
          </div>
        </motion.section>

        {/* Models */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <h2 className="section-label mb-3">AI Models</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {models.map((model) => (
              <div key={model.name} className="surface-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {model.name}
                  </h3>
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      color: model.statusColor,
                      background: model.status === 'Primary' ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                    }}
                  >
                    {model.status}
                  </span>
                </div>
                <ul className="space-y-2">
                  {model.specs.map((spec, i) => (
                    <li
                      key={i}
                      className="text-sm flex items-start gap-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-faint)' }} />
                      {spec}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Metrics */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="section-label mb-3">System Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="surface-card p-4 text-center">
                <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-faint)' }}>
                  {m.label}
                </p>
                <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Tech Stack */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <h2 className="section-label mb-3">Technical Architecture</h2>
          <div className="surface-card p-5">
            <ul className="space-y-2.5">
              {techStack.map((item, i) => (
                <li
                  key={i}
                  className="text-sm flex items-start gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-faint)' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* Research */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="section-label mb-3">Research Implications</h2>
          <div className="surface-card p-5">
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This project explores the potential of multi-model stateless AI systems, challenging the
              assumption that accumulated knowledge is necessary for meaningful interaction. By leveraging
              both Mistral-Small and Ministral-3B, we achieve robust performance while maintaining
              zero-state architecture — suggesting new possibilities in ephemeral intelligence and
              privacy-first AI design.
            </p>
          </div>
        </motion.section>

        {/* Footer */}
        <div className="text-center space-y-0.5">
          <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
            v1.0.0 • Production • Last deployed 2025
          </p>
        </div>
      </div>
    </div>
  );
}
