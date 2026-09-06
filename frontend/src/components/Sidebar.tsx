import { NavLink } from "react-router-dom";
import { Folder, History, Info, LibraryBig, Settings2, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

interface Item {
  to: string;
  label: string;
  Icon: typeof Sparkles;
  end?: boolean;
}

const ITEMS: Item[] = [
  { to: "/", label: "Studio", Icon: Sparkles, end: true },
  { to: "/generate", label: "Generate", Icon: Wand2 },
  { to: "/projects", label: "Projects", Icon: Folder },
  { to: "/history", label: "History", Icon: History },
  { to: "/library", label: "Audio Library", Icon: LibraryBig },
  { to: "/settings", label: "Settings", Icon: Settings2 },
  { to: "/about", label: "About", Icon: Info },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="glass h-full w-64 shrink-0 border-r border-white/5 flex flex-col">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <div className="divider" />
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto" aria-label="Primary">
        {ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-brand-gradient text-white shadow-glow"
                  : "text-ink-300 hover:text-ink-100 hover:bg-white/5",
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="divider" />
      <div className="px-5 py-4 text-[11px] text-ink-400 leading-relaxed">
        <div className="text-ink-200 font-medium">Developed by Rajeshwar Singh</div>
        <div className="mt-0.5">Powered by ACE-Step V1.5</div>
      </div>
    </aside>
  );
}
