import clsx from "clsx";
import Image from "next/image";

export function BrandLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("brand-logo", compact && "compact", className)}>
      <Image
        className="brand-icon"
        src="/ata-logo.svg"
        alt="ATA CRM"
        width={58}
        height={42}
        priority
      />
      <div className="brand-text">
        <strong>ATA CRM</strong>
        {!compact ? <span>Abadis Tejarat Arka</span> : null}
      </div>
    </div>
  );
}
