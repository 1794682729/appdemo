import type { CategoryDto } from "../lib/api";

interface Props {
  categories: CategoryDto[];
  selectedId: string;
  onSelect: (id: string) => void;
  filterType?: "expense" | "income";
}

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  filterType,
}: Props) {
  const filtered = filterType
    ? categories.filter(
        (c) => c.type === filterType || c.type === "both",
      )
    : categories;

  if (filtered.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">暂无分类，请先在设置中添加</p>;
  }

  return (
    <div>
      <div className="mb-2 text-xs text-slate-500">分类</div>
      <div className="grid grid-cols-4 gap-2">
        {filtered.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={[
              "flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center transition",
              selectedId === cat.id
                ? "bg-teal-50 ring-1 ring-teal-300"
                : "bg-slate-50 ring-1 ring-slate-100 active:bg-slate-100",
            ].join(" ")}
          >
            <span className="text-2xl">{cat.icon}</span>
            <span className="w-full truncate text-xs leading-tight text-slate-700">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
