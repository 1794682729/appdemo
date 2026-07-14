interface Props {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function AmountInput({ value, onChange, disabled }: Props) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-5 ring-1 ring-slate-200">
      <div className="mb-1 text-xs text-slate-500">金额</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-light text-slate-400">¥</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="0.00"
          className="w-full bg-transparent text-4xl font-semibold text-slate-900 outline-none placeholder:text-slate-300"
        />
      </div>
    </div>
  );
}
