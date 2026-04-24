import React from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Cpu, Plus, Settings } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: <Cpu className="w-4 h-4" /> },
    { href: "/jobs/new", label: "New Training Job", icon: <Plus className="w-4 h-4" /> },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full">
      {/* Sidebar — glass */}
      <aside className="w-64 hidden md:flex flex-col glass-strong border-r border-white/5 m-3 mr-0 rounded-2xl overflow-hidden">
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center gap-2 text-primary"
          >
            <div className="relative">
              <Cpu className="w-6 h-6 relative z-10" />
              <div className="absolute inset-0 blur-md bg-primary/60 -z-0" />
            </div>
            <span className="font-display font-bold text-lg text-sidebar-foreground tracking-tight">
              LoRA Forge
            </span>
          </motion.div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item, i) => {
            const isActive =
              location === item.href ||
              (location.startsWith("/jobs/") && item.href !== "/" && location !== "/jobs/new" && item.href === "/");
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.08 * (i + 1), ease: "easeOut" }}
              >
                <Link
                  href={item.href}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium overflow-hidden group ${
                    isActive
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-primary/15 border border-primary/30 rounded-lg"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className={`absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg ${isActive ? "hidden" : ""}`} />
                  <span className="relative z-10 flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/40">
            <Settings className="w-4 h-4" />
            Settings
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header — glass */}
        <div className="md:hidden flex items-center justify-between p-4 glass-subtle border-b border-white/5">
          <div className="flex items-center gap-2 text-primary">
            <Cpu className="w-5 h-5" />
            <span className="font-display font-bold text-md text-foreground">LoRA Forge</span>
          </div>
          <Link href="/jobs/new" className="text-primary">
            <Plus className="w-5 h-5" />
          </Link>
        </div>

        <main className="flex-1 p-6 lg:p-10 overflow-auto">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
