import Image from 'next/image'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0" style={{ width: compact ? 36 : 44, height: compact ? 36 : 44 }}>
        <div className="absolute inset-0 rounded-lg bg-[hsl(var(--gold)/0.08)] border border-[hsl(var(--gold)/0.2)]" />
        <Image
          src="/images/MP-LOGO.png"
          alt="Minda Prima"
          fill
          priority
          className="object-contain p-1"
          sizes={compact ? "36px" : "44px"}
        />
      </div>
      {!compact && (
        <div>
          <h1
            className="text-xl leading-none tracking-wide text-[hsl(var(--foreground))]"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Minda Prima
          </h1>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] mt-0.5">
            Management Portal
          </p>
        </div>
      )}
    </div>
  )
}