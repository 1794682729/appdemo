/** Store money as integer cents to avoid float errors. */

export function yuanToCents(yuan: number | string): number {
  const n = typeof yuan === "string" ? Number(yuan) : yuan;
  if (!Number.isFinite(n)) {
    throw new Error("Invalid amount");
  }
  return Math.round(n * 100);
}

export function centsToYuan(cents: number): number {
  return cents / 100;
}

export function formatCNY(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const yuan = abs / 100;
  return `${sign}¥${yuan.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseYuanInput(input: string): number {
  const trimmed = input.trim().replace(/,/g, "");
  if (!trimmed) {
    throw new Error("金额不能为空");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("金额格式不正确");
  }
  return yuanToCents(trimmed);
}
