export function HeroSection() {
  return (
    <section id="section-1" className="h-screen relative px-8 md:px-16 lg:px-18">
      {/* Top-left quadrant: subtitle + dominant name */}
      <div className="absolute top-28 md:top-32 left-8 md:left-16 lg:left-18">
        <p className="reveal section-label text-[#00FFCC] tracking-widest text-[11px] font-mono uppercase mb-3 opacity-90">
          Founder &amp; Integrations Engineer
        </p>
        <h1 className="reveal reveal-delay-1 text-5xl md:text-6xl font-bold text-white leading-[0.9] tracking-tight font-heading">
          Eris
          <br />
          Dothard
        </h1>
      </div>

      {/* Bottom-center: scroll indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
        <div className="reveal reveal-delay-2 flex flex-col items-center gap-3 opacity-25 hover:opacity-40 transition-opacity duration-500">
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-text-muted/50 to-transparent animate-pulse" />
        </div>
      </div>
    </section>
  )
}
