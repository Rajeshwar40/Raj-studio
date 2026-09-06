import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-24 text-center">
      <div className="text-6xl font-black text-transparent bg-brand-gradient bg-clip-text">404</div>
      <div className="mt-3 text-lg font-semibold text-ink-100">Page not found</div>
      <div className="text-sm text-ink-400 mt-1">
        The page you tried to open does not exist in Raj Studio.
      </div>
      <Link to="/" className="btn-primary h-10 px-5 mt-6 inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to Studio
      </Link>
    </div>
  );
}
