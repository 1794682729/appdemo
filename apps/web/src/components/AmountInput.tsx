interface Props { value: string; onChange: (val: string) => void; disabled?: boolean; }

export function AmountInput({ value, onChange, disabled }: Props) {
  return (
    <div className="text-center">
      <div className="flex items-baseline justify-center gap-1.5">
        <span className="text-[34px] font-light text-ios-secondary">¥</span>
        <input
          type="text" inputMode="decimal"
          value={value} onChange={(e) => onChange(e.target.value)}
          disabled={disabled} placeholder="0"
          className="w-full max-w-[220px] bg-transparent text-center text-[64px] font-bold text-ios-text tracking-[-1px] outline-none placeholder:text-ios-tertiary/50"
        />
      </div>
      <div className="mx-auto mt-1 h-[3px] w-10 rounded-full bg-ios-accent/30" />
    </div>
  );
}
