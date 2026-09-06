/** Dev-only bisect switches read from the URL: ?noenv ?noshadow ?nosmaa ?noao ?nodof ?novol */
export const dbg = (flag: string): boolean =>
  import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has(flag)
