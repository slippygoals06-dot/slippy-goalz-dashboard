/** Quiet shimmer skeleton — Linear-style loading (styles in index.css .sk-wave) */

export function SkeletonBlock({ height = 16, width = "100%", radius = 8, style }) {
  return (
    <div
      className="sk-wave"
      style={{
        height,
        width,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

/**
 * Wrap real content after loading — soft fade from skeleton.
 * Usage: {loading ? <Skeleton…/> : <ContentReveal>{children}</ContentReveal>}
 */
export function ContentReveal({ children, className = "", style }) {
  return (
    <div className={`content-reveal ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{ padding: "40px 32px 64px", maxWidth: 1440, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <SkeletonBlock height={28} width={180} radius={10} />
          <SkeletonBlock height={14} width={260} radius={8} style={{ marginTop: 8 }} />
        </div>
        <SkeletonBlock height={40} width={280} radius={10} />
      </div>
      <SkeletonBlock height={72} width="100%" radius={18} style={{ marginBottom: 16 }} />
      <SkeletonBlock height={96} width="100%" radius={18} style={{ marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} height={44} radius={10} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
        <SkeletonBlock height={280} radius={18} />
        <SkeletonBlock height={280} radius={18} />
      </div>
      <SkeletonBlock height={320} radius={18} />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div style={{ padding: 16 }}>
      {[...Array(rows)].map((_, i) => (
        <SkeletonBlock
          key={i}
          height={56}
          radius={10}
          style={{ marginBottom: 8, animationDelay: `${i * 40}ms` }}
        />
      ))}
    </div>
  );
}

export default function Skeleton({ rows = 6 }) {
  return <TableSkeleton rows={rows} />;
}
