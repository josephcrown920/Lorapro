import React from "react";
import { Link, useLocation } from "wouter";
import { Cpu, Plus, Settings } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: <Cpu className="w-4 h-4" /> },
    { href: "/jobs/new", label: "New Training Job", icon: <Plus className="w-4 h-4" /> },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-sidebar flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-2 text-primary">
            <Cpu className="w-6 h-6" />
            <span className="font-display font-bold text-lg text-sidebar-foreground">
              LoRA Forge
            </span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (location.startsWith("/jobs/") && item.href !== "/" && location !== "/jobs/new" && item.href === "/");
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}>
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/50">
            <Settings className="w-4 h-4" />
            Settings
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background">
          <div className="flex items-center gap-2 text-primary">
            <Cpu className="w-5 h-5" />
            <span className="font-display font-bold text-md text-foreground">
              LoRA Forge
            </span>
          </div>
          <Link href="/jobs/new" className="text-primary">
            <Plus className="w-5 h-5" />
          </Link>
        </div>

        <main className="flex-1 p-6 lg:p-10 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
