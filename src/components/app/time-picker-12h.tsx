import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * 12-hour clock picker. Stores value as 24h "HH:MM" so scheduling logic stays
 * unchanged, but operators never see military time.
 */
export function TimePicker12h({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  const [hRaw, mRaw] = (value || "10:00").split(":");
  const h24 = Number(hRaw) || 0;
  const minute = (mRaw ?? "00").padStart(2, "0");
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;

  const emit = (h12: number, min: string, mer: string) => {
    const base = h12 % 12;
    const next = mer === "PM" ? base + 12 : base;
    onChange(`${String(next).padStart(2, "0")}:${min}`);
  };

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <Select value={String(hour12)} onValueChange={(v) => emit(Number(v), minute, meridiem)}>
        <SelectTrigger className="h-8 w-[68px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <SelectItem key={h} value={String(h)}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select value={minute} onValueChange={(v) => emit(hour12, v, meridiem)}>
        <SelectTrigger className="h-8 w-[68px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {["00", "15", "30", "45"].map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={meridiem} onValueChange={(v) => emit(hour12, minute, v)}>
        <SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}