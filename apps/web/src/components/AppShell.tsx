import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/", label: "流水", emoji: "📋" },
  { to: "/stats", label: "统计", emoji: "📊" },
  { to: "/budget", label: "预算", emoji: "💰" },
  { to: "/settings", label: "我的", emoji: "⚙️" },
];

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-ios-bg">
      <main className="flex-1 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Outlet />
      </main>

      {/* iOS 26 floating glass tab bar */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 flex justify-center pb-2 pointer-events-none">
        <nav className="pointer-events-auto glass-heavy mx-4 flex w-full max-w-lg items-center justify-around rounded-[28px] border border-white/20 px-2 py-1.5 shadow-lg shadow-black/5">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                [
                  "flex flex-1 flex-col items-center gap-0.5 rounded-[22px] py-1.5 text-[10px] font-medium transition-all duration-250",
                  isActive
                    ? "bg-ios-accent/12 text-ios-accent"
                    : "text-ios-secondary",
                ].join(" ")
              }
            >
              <span className="text-lg">{tab.emoji}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
