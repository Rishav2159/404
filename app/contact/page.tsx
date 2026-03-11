"use client";
import { motion } from "framer-motion";
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
        alert('Message sent successfully!');
      }, (error) => {
        console.error('Error:', error);
        alert(`Failed to send message. Error: ${error.text || 'Unknown error'}`);
      });
  };

  return (
    <div className="min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Get in touch
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Have a question or feedback? Send us a message and we&apos;ll get back to you within 24–48 hours.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          className="surface-card p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                name="designation"
                className="input-field w-full px-3 py-2.5"
                placeholder="Your name"
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                name="email"
                className="input-field w-full px-3 py-2.5"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                className="input-field w-full px-3 py-2.5"
                style={{ minHeight: '140px', resize: 'vertical' }}
                placeholder="What would you like to say?"
              />
            </div>

            <button
              id="contact-submit"
              type="submit"
              className="btn-primary w-full py-2.5"
            >
              Send message
            </button>
          </form>
        </motion.div>

        {/* Info */}
        <motion.p
          className="text-center text-[12px] mt-6"
          style={{ color: 'var(--text-faint)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Your message is sent securely. We typically respond within 24–48 hours.
        </motion.p>
      </div>
    </div>
  );
}
