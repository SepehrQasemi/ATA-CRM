import clsx from "clsx";

export function BrandLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("brand-logo", compact && "compact", className)}>
      <svg
        className="brand-icon"
        viewBox="0 0 64 64"
        role="img"
        aria-label="CRM Food Trading"
      >
        <defs>
          <linearGradient id="brandGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#26a85a" />
            <stop offset="100%" stopColor="#0f6f37" />
          </linearGradient>
        </defs>
        <rect x="5" y="5" width="54" height="54" rx="14" fill="url(#brandGradient)" />
        <path
          d="M19 37c0-8.8 6.7-15 16.7-15 4.1 0 8.2 1.1 11.4 3.5l-3.1 5.4c-2.1-1.5-5-2.3-8-2.3-5.7 0-9.3 3.3-9.3 8.5 0 5.2 3.4 8.7 9.2 8.7 2.8 0 5.8-.7 7.9-2.1l3.1 5.2c-3 2.3-7.1 3.6-11.5 3.6-9.8 0-16.4-6.4-16.4-15.5z"
          fill="#ffffff"
        />
      </svg>
      <div className="brand-text">
        <strong>CRM Food Trading</strong>
        {!compact ? <span>B2B Sales Workspace</span> : null}
      </div>
    </div>
  );
}
