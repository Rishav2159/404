"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { usePathname } from "next/navigation";

const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);
const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

const navItems = [
  { href: "/", label: "Chat", icon: "💬" },
  { href: "/about", label: "About", icon: "✨" },
  { href: "/contact", label: "Contact", icon: "✉️" },
];

const MobileNavbar = ({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) => {
  const pathname = usePathname();
  return (
    <motion.nav
      className="fixed top-0 left-0 w-full flex items-center justify-between px-4 h-16 z-50 glass"
      initial={{ y: -64 }} animate={{ y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg"
          style={{ background: 'var(--gradient-accent)', boxShadow: '0 4px 14px var(--accent-glow)' }}>
          404
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Intelligence</span>
      </Link>
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all duration-200"
              style={{ background: isActive ? 'var(--accent-subtle)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
              <span className="text-base">{item.icon}</span>
              <span className="hidden sm:inline font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button onClick={toggleTheme} className="ml-1 w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </motion.nav>
  );
};

const DesktopNavbar = ({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) => {
  const pathname = usePathname();
  return (
    <motion.nav className="fixed left-0 top-0 h-full w-[260px] flex flex-col z-50 glass"
      style={{ borderRight: '1px solid var(--border-subtle)' }}
      initial={{ x: -280 }} animate={{ x: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>

      <div className="px-5 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'var(--gradient-accent)', boxShadow: '0 6px 18px var(--accent-glow)' }}>
              404
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>404 Intelligence</p>
              <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Stateless AI</p>
            </div>
          </Link>
          <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      <div className="mx-5 h-px" style={{ background: 'var(--border-subtle)' }} />

      <div className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{
                background: isActive ? 'var(--accent-subtle)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: isActive ? '1px solid var(--accent-subtle)' : '1px solid transparent',
              }}>
              <span className="text-base">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </Link>
          );
        })}
      </div>

      <div className="px-5 py-5">
        <div className="surface-card p-4">
          <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Model</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>openrouter/free</p>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-faint)' }}>No memory • No context</p>
        </div>
      </div>
    </motion.nav>
  );
};

const Navbar = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [theme, setTheme] = useState('dark');
  const isDesktopQuery = useMediaQuery({ minWidth: 768 });

  useEffect(() => { setIsDesktop(isDesktopQuery); }, [isDesktopQuery]);
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  return isDesktop ? <DesktopNavbar theme={theme} toggleTheme={toggleTheme} /> : <MobileNavbar theme={theme} toggleTheme={toggleTheme} />;
};

export default Navbar;
