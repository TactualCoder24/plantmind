"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, FileText, Network, ShieldCheck, LayoutDashboard, Wrench, Sun, Moon, LogIn, LogOut, ListChecks, Sparkles } from "lucide-react";
import { useRole, ROLE_LABELS } from "@/lib/roleContext";
import { useTheme } from "@/lib/themeContext";
import { useAuth } from "@/lib/authContext";
import { Role } from "@/lib/types";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Ask a Question", icon: MessageSquare },
  { href: "/rca", label: "Root Cause", icon: Wrench },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/graph", label: "Connections", icon: Network },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/audit", label: "Audit Log", icon: ListChecks },
  { href: "/features", label: "Features", icon: Sparkles },
];

// The marketing landing page and the auth form render their own minimal headers.
const NAV_HIDDEN_ROUTES = new Set(["/", "/login"]);

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole } = useRole();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  if (NAV_HIDDEN_ROUTES.has(pathname)) return null;

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden md:flex items-center justify-between border-b border-border bg-canvas/80 backdrop-blur px-6 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-8 min-w-0">
          <Link href="/" className="flex items-center gap-2 font-display font-semibold text-text shrink-0">
            <span className="h-7 w-7 rounded-md bg-accent flex items-center justify-center text-accent-fg font-bold text-sm">PM</span>
            PlantMind
          </Link>
          <nav className="flex items-center gap-1">
            {ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    active ? "bg-accent/10 text-accent" : "text-text-muted hover:text-text hover:bg-surface-2"
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="bg-surface border border-border text-text text-sm rounded-md px-2 py-1.5"
          >
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted max-w-[140px] truncate" title={user.email}>
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 border border-border text-sm text-text-secondary hover:text-text hover:border-border-strong rounded-md px-3 py-1.5"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 border border-border text-sm text-text-secondary hover:text-text hover:border-border-strong rounded-md px-3 py-1.5"
            >
              <LogIn size={14} />
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between border-b border-border bg-canvas px-4 py-3 sticky top-0 z-30 gap-2">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold text-text shrink-0">
          <span className="h-6 w-6 rounded-md bg-accent flex items-center justify-center text-accent-fg font-bold text-xs">PM</span>
          PlantMind
        </Link>
        <div className="flex items-center gap-1.5">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="bg-surface border border-border text-text text-xs rounded-md px-2 py-1 min-w-0"
          >
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <ThemeToggleButton theme={theme} onToggle={toggleTheme} compact />
          {user ? (
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-text-secondary"
            >
              <LogOut size={14} />
            </button>
          ) : (
            <Link
              href="/login"
              aria-label="Sign in"
              className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-text-secondary"
            >
              <LogIn size={14} />
            </Link>
          )}
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-canvas border-t border-border flex items-center overflow-x-auto py-1.5">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md text-[10px] shrink-0 whitespace-nowrap ${
                active ? "text-accent" : "text-text-muted"
              }`}
            >
              <Icon size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function ThemeToggleButton({ theme, onToggle, compact }: { theme: string; onToggle: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle light / dark theme"
      className={`flex items-center justify-center rounded-md border border-border text-text-secondary hover:text-text hover:border-border-strong ${
        compact ? "h-7 w-7" : "h-8 w-8"
      }`}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
