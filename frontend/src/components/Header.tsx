import { Github, Menu, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { StatusPill } from "./StatusPill";
import { cn } from "@/lib/cn";

interface Props {
  onOpenSidebar: () => void;
  repoUrl?: string;
  className?: string;
}

export function Header({ onOpenSidebar, repoUrl, className }: Props) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-14 backdrop-blur-xl bg-ink-950/70 border-b border-white/5",
        className,
      )}
    >
      <div className="h-full px-4 sm:px-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="btn-ghost h-9 w-9 p-0 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="lg:hidden">
          <Logo compact />
        </div>
        <div className="flex-1" />
        <StatusPill />
        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary h-9 px-3 hidden sm:inline-flex"
            title="GitHub repository"
          >
            <Github className="h-4 w-4" />
            <span className="hidden md:inline">GitHub</span>
          </a>
        )}
        <Link
          to="/settings"
          className="btn-ghost h-9 w-9 p-0"
          title="Settings"
          aria-label="Settings"
        >
          <Settings2 className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
