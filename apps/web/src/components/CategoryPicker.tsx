import type { CategoryDto } from "../lib/api";

interface Props { categories: CategoryDto[]; selectedId: string; onSelect: (id: string) => void; filterType?: "expense" | "income"; }

export function CategoryPicker({ categories, selectedId, onSelect, filterType }: Props) {
  const filtered = filterType ? categories.filter((c) => c.type === filterType || c.type === "both") : categories;
  if (filtered.length === 0) return <p className="py-6 text-center text-[14px] text-ios-tertiary">暂无分类</p>;

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {filtered.map((cat) => (
        <button
          key={cat.id} type="button" onClick={() => onSelect(cat.id)}
          className={[
            "flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3.5 transition-all duration-200 active:scale-95",
            selectedId === cat.id
              ? "glass-accent border border-ios-accent/20 text-ios-accent shadow-sm"
              : "glass-card text-ios-text",
          ].join(" ")}
        >
          <span className="text-2xl">{cat.icon}</span>
          <span className={`w-full truncate text-[11px] font-medium ${selectedId === cat.id ? "text-ios-accent" : "text-ios-secondary"}`}>
            {cat.name}
          </span>
        </button>
      ))}
    </div>
  );
}
