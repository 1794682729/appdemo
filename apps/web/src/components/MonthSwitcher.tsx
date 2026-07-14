import { shiftYearMonth, formatYearMonthLabel, currentYearMonth } from "@liushui/shared";

interface Props { yearMonth: string; onChange: (ym: string) => void; }

export function MonthSwitcher({ yearMonth, onChange }: Props) {
  const isCurrent = yearMonth === currentYearMonth();
  return (
    <div className="glass-button inline-flex items-center gap-0 rounded-full px-1 py-1">
      <button type="button" onClick={() => onChange(shiftYearMonth(yearMonth, -1))}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ios-secondary transition active:bg-black/5"
        aria-label="上月">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span className="text-[15px] font-semibold text-ios-text min-w-[72px] text-center tabular-nums">
        {formatYearMonthLabel(yearMonth)}
      </span>
      <button type="button" onClick={() => onChange(shiftYearMonth(yearMonth, 1))}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ios-secondary transition active:bg-black/5 disabled:opacity-25"
        disabled={isCurrent} aria-label="下月">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  );
}
