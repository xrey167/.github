import { Link, Navigate, Route, Routes } from "react-router-dom";

import AdsPage from "./routes/AdsPage";
import BacklinksPage from "./routes/BacklinksPage";
import ChatPage from "./routes/ChatPage";
import ComparePage from "./routes/ComparePage";
import DomainAnalyticsPage from "./routes/DomainAnalyticsPage";
import KeywordsPage from "./routes/KeywordsPage";
import OnPagePage from "./routes/OnPagePage";
import SerpPage from "./routes/SerpPage";
import DomainPage from "./routes/DomainPage";
import SocialPage from "./routes/SocialPage";
import TasksPage from "./routes/TasksPage";
import TrafficPage from "./routes/TrafficPage";
import UsagePage from "./routes/UsagePage";
import SettingsPage from "./routes/SettingsPage";

const navItems = [
  { to: "/keywords", label: "Keywords" },
  { to: "/serp", label: "SERP" },
  { to: "/domain", label: "Domain" },
  { to: "/backlinks", label: "Backlinks" },
  { to: "/domain-analytics", label: "Domain Analytics" },
  { to: "/on-page", label: "On-Page" },
  { to: "/traffic", label: "Traffic" },
  { to: "/ads", label: "Ads" },
  { to: "/social", label: "Social" },
  { to: "/compare", label: "Compare" },
  { to: "/tasks", label: "Tasks" },
  { to: "/chat", label: "Chat" },
  { to: "/usage", label: "Usage" },
  { to: "/settings", label: "Settings" },
];

export default function App() {
  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r bg-slate-50 p-4">
        <h1 className="mb-6 text-lg font-semibold">DataForSEO</h1>
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
          <Route path="/serp/*" element={<SerpPage />} />
          <Route path="/domain/*" element={<DomainPage />} />
          <Route path="/backlinks" element={<BacklinksPage />} />
          <Route path="/domain-analytics" element={<DomainAnalyticsPage />} />
          <Route path="/on-page" element={<OnPagePage />} />
          <Route path="/traffic" element={<TrafficPage />} />
          <Route path="/ads" element={<AdsPage />} />
          <Route path="/social" element={<SocialPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
