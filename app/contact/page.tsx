"use client";
import { motion } from "framer-motion";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import emailjs from 'emailjs-com';

export default function Contact() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const userId = process.env.NEXT_PUBLIC_EMAILJS_USER_ID;

    if (!serviceId || !templateId || !userId) {
      alert('Email configuration is missing');
      return;
    }

    emailjs.sendForm(serviceId, templateId, event.currentTarget, userId)
      .then(() => {
        alert('Email sent successfully!');
      }, (error) => {
        console.error('Error:', error);
        alert(`Failed to send email. Error: ${error.text || 'Unknown error'}`);
      });
  };

  return (
    <motion.div 
      className="bg-zinc-950 min-h-screen pt-20 px-4 sm:px-6 lg:px-8"
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
          <TypingAnimation className="text-4xl font-bold text-zinc-300 mb-4 sm:text-5xl">
            Contact
          </TypingAnimation>
          <div className="w-24 h-1 bg-zinc-700 mx-auto"></div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-zinc-900 p-6 sm:p-8 rounded-lg shadow-2xl border border-zinc-800"
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-zinc-500 mb-2 font-mono">Identification</label>
              <input 
                type="text" 
                name="designation"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-zinc-700 font-mono"
                placeholder="Enter your designation..."
              />
            </div>
            
            <div>
              <label className="block text-zinc-500 mb-2 font-mono">Communication Channel</label>
              <input 
                type="email" 
                name="email"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-zinc-700 font-mono"
                placeholder="Enter your email address..."
              />
            </div>

            <div>
              <label className="block text-zinc-500 mb-2 font-mono">Message Payload</label>
              <textarea 
                name="message"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-3 rounded h-32 focus:outline-none focus:ring-2 focus:ring-zinc-700 font-mono"
                placeholder="Enter your message..."
              />
            </div>

            <button
              className="w-full bg-zinc-800 text-zinc-300 py-3 rounded font-mono hover:bg-zinc-700 transition-colors"
              type="submit"
            >
              TRANSMIT MESSAGE
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-8 text-center text-zinc-600 font-mono"
        >
          <p className="text-sm sm:text-base">SECURE TRANSMISSION PROTOCOL ENABLED</p>
          <p className="text-sm sm:text-base">RESPONSE TIME: 24-48 HOURS</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

