import { Phone } from "lucide-react";

/** Click-to-call: dials from the user's own device (no voice infra, no new compliance surface). */
export function PhoneLink({
  phone,
  className = "",
  showIcon = true,
}: {
  phone?: string | null;
  className?: string;
  showIcon?: boolean;
}) {
  if (!phone) return <span className={className}>—</span>;
  const dial = phone.replace(/[^0-9+]/g, "");
  return (
    <a
      href={`tel:${dial}`}
      onClick={(e) => e.stopPropagation()}
      title={`Call ${phone}`}
      className={`inline-flex items-center gap-1 hover:text-primary hover:underline underline-offset-2 ${className}`}
    >
      {showIcon && <Phone className="h-3 w-3 shrink-0" />}
      {phone}
    </a>
  );
}
