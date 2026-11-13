/**
 * Screenshot file for each case study. Files are versioned and never replaced in place
 * (browsers and the CDN cache by path), so a new image gets a new version number here.
 */
const SHOT_VERSION: Record<string, number> = {
  dispatchrelay: 2,
}

export const shotSrc = (slug: string) => `/img/work-${slug}-v${SHOT_VERSION[slug] ?? 1}.jpg`
