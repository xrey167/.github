import { Link, Navigate, Route, Routes } from "react-router-dom";

import ErrorBoundary from "./components/ErrorBoundary";
import ProjectSwitcher from "./components/ProjectSwitcher";
import { ProjectProvider } from "./lib/project-store";
import AdsPage from "./routes/AdsPage";
import AiVisibilityPage from "./routes/AiVisibilityPage";
import AppsPage from "./routes/AppsPage";
import AuditPage from "./routes/AuditPage";
import BacklinksPage from "./routes/BacklinksPage";
import BrandPage from "./routes/BrandPage";
import ChatPage from "./routes/ChatPage";
import ComparePage from "./routes/ComparePage";
import DomainAnalyticsPage from "./routes/DomainAnalyticsPage";
import KeywordClusteringPage from "./routes/KeywordClusteringPage";
import KeywordsPage from "./routes/KeywordsPage";
import OnPagePage from "./routes/OnPagePage";
import OnboardingPage, { useOnboardingGate } from "./routes/OnboardingPage";
import SerpPage from "./routes/SerpPage";
import DomainPage from "./routes/DomainPage";
import TopicPage from "./routes/TopicPage";
import TrackingPage from "./routes/TrackingPage";
import SocialPage from "./routes/SocialPage";
import TasksPage from "./routes/TasksPage";
import TrafficPage from "./routes/TrafficPage";
import ReportsPage from "./routes/ReportsPage";
import UsagePage from "./routes/UsagePage";
import SettingsPage from "./routes/SettingsPage";

const navItems = [
  { to: "/keywords", label: "Keywords" },
  { to: "/clustering", label: "Keyword Clustering" },
  { to: "/topic", label: "Topic Research" },
  { to: "/serp", label: "SERP" },
  { to: "/tracking", label: "Tracking" },
  { to: "/domain", label: "Domain" },
  { to: "/backlinks", label: "Backlinks" },
  { to: "/domain-analytics", label: "Domain Analytics" },
  { to: "/on-page", label: "On-Page" },
  { to: "/audit", label: "Site Audit" },
  { to: "/traffic", label: "Traffic" },
  { to: "/ads", label: "Ads" },
  { to: "/social", label: "Social" },
  { to: "/brand", label: "Brand Monitor" },
  { to: "/ai-visibility", label: "AI Visibility" },
  { to: "/apps", label: "Apps" },
  { to: "/compare", label: "Compare" },
  { to: "/tasks", label: "Tasks" },
  { to: "/chat", label: "Chat" },
  { to: "/reports", label: "Reports" },
  { to: "/usage", label: "Usage" },
  { to: "/settings", label: "Settings" },
];

export default function App() {
  return (
    <ErrorBoundary>
      <ProjectProvider>
        <AppShell />
      </ProjectProvider>
    </ErrorBoundary>
  );
}

function AppShell() {
  const [status, markReady, gate] = useOnboardingGate();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        Connecting…
      </div>
    );
  }
  if (status === "needs-onboarding") {
    return <OnboardingPage onComplete={markReady} />;
  }
  if (status === "error") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-md rounded border bg-white p-6 text-center text-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-800">Couldn't reach DataForSEO</h2>
          <p className="mb-4 text-slate-600">
            {gate.errorMessage ?? "Network or service error."}
          </p>
          <p className="mb-4 text-xs text-slate-500">
            Likely transient. Check your connection and retry — your credentials are still
            saved.
          </p>
          <button
            type="button"
            onClick={gate.retry}
            className="rounded bg-slate-800 px-4 py-2 text-sm text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r bg-slate-50 p-4">
        <h1 className="mb-3 text-lg font-semibold">DataForSEO</h1>
        <ProjectSwitcher />
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/keywords" replace />} />
          <Route path="/keywords/*" element={<KeywordsPage />} />
          <Route path="/clustering" element={<KeywordClusteringPage />} />
          <Route path="/topic" element={<TopicPage />} />
          <Route path="/serp/*" element={<SerpPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/domain/*" element={<DomainPage />} />
          <Route path="/backlinks" element={<BacklinksPage />} />
          <Route path="/domain-analytics" element={<DomainAnalyticsPage />} />
          <Route path="/on-page" element={<OnPagePage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/traffic" element={<TrafficPage />} />
          <Route path="/ads" element={<AdsPage />} />
          <Route path="/social" element={<SocialPage />} />
          <Route path="/brand" element={<BrandPage />} />
          <Route path="/ai-visibility" element={<AiVisibilityPage />} />
          <Route path="/apps" element={<AppsPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
