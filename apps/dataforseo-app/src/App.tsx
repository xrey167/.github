import { Link, Navigate, Route, Routes } from "react-router-dom";

import KeywordsPage from "./routes/KeywordsPage";
import SerpPage from "./routes/SerpPage";
import DomainPage from "./routes/DomainPage";
import TasksPage from "./routes/TasksPage";
import UsagePage from "./routes/UsagePage";
import SettingsPage from "./routes/SettingsPage";

const navItems = [
  { to: "/keywords", label: "Keywords" },
  { to: "/serp", label: "SERP" },
  { to: "/domain", label: "Domain" },
  { to: "/tasks", label: "Tasks" },
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
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
