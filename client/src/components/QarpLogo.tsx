export function QarpLogo({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-label="The QARP Logo"
      className={className}
    >
      {/* Shield / quality mark shape */}
      <path
        d="M24 4L6 12v12c0 11.1 7.68 21.48 18 24 10.32-2.52 18-12.9 18-24V12L24 4z"
        fill="none"
        stroke="hsl(190, 100%, 42%)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Checkmark inside */}
      <path
        d="M16 24l5.5 5.5L32 19"
        fill="none"
        stroke="hsl(190, 100%, 42%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function QarpLogoFull({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <QarpLogo size={36} />
      <div className="flex flex-col">
        <span className="font-display text-lg font-bold tracking-tight text-foreground leading-none">
          The QARP
        </span>
        <span className="text-[10px] text-muted-foreground tracking-wider uppercase leading-tight mt-0.5">
          Quality Assurance Research Professionals
        </span>
      </div>
    </div>
  );
}
