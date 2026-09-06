import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { TopBanner } from "@/components/TopBanner";
import { StudioPage } from "@/pages/StudioPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AboutPage } from "@/pages/AboutPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { APP_VERSION, REPO_URL } from "@/lib/constants";

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-full flex flex-col">
      <TopBanner />
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      {/* Sidebar: static on lg+, drawer on mobile */}
      <div className="hidden lg:block sticky top-8 h-[calc(100vh-2rem)]">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute inset-y-0 left-0 w-64"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          onOpenSidebar={() => setMobileOpen(true)}
          repoUrl={REPO_URL}
        />

        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<StudioPage />} />
            <Route path="/generate" element={<StudioPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <Footer version={APP_VERSION} repoUrl={REPO_URL} />
      </div>
    </div>
    </div>
  );
}
