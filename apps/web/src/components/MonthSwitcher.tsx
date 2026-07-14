import { shiftYearMonth, formatYearMonthLabel } from "@liushui/shared";
import { currentYearMonth } from "@liushui/shared";

interface Props {
  yearMonth: string;
  onChange: (ym: string) => void;
}

export function MonthSwitcher({ yearMonth, onChange }: Props) {
  const isCurrent = yearMonth === currentYearMonth();

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => onChange(shiftYearMonth(yearMonth, -1))}
        className="rounded-lg px-3 py-2 text-sm text-slate-500 active:bg-slate-100"
      >
        ← 上月
      </button>
      <div className="text-center">
        <span className="text-lg font-semibold text-slate-900">
          {formatYearMonthLabel(yearMonth)}
        </span>
        {!isCurrent && (
          <button
            type="button"
            onClick={() => onChange(currentYearMonth())}
            className="ml-2 text-xs text-teal-600 underline"
          >
            回本月
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(shiftYearMonth(yearMonth, 1))}
        className="rounded-lg px-3 py-2 text-sm text-slate-500 active:bg-slate-100"
        disabled={isCurrent}
      >
        下月 →
      </button>
    </div>
  );
}
