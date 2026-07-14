import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/", label: "首页", end: true },
  { to: "/stats", label: "统计" },
  { to: "/budget", label: "预算" },
  { to: "/settings", label: "我的" },
];

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-slate-50">
      <main className="flex-1 px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))]">
        <Outlet />
      </main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                [
                  "flex h-14 items-center justify-center text-sm font-medium",
                  isActive ? "text-teal-700" : "text-slate-500",
                ].join(" ")
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
