import { shotSrc } from '../lib/shots'
import { testimonials } from '../data/portfolio'
import type { Testimonial } from '../data/portfolio'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(jr|sr)\.?$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The person and the build, under every review. */
function Attribution({ t, link }: { t: Testimonial; link: boolean }) {
  return (
    <figcaption className="review-by">
      <span className="review-person">
        <span className="review-avatar" aria-hidden>
          {initials(t.name)}
        </span>
        <span className="min-w-0">
          <span className="block text-text text-sm md:text-[15px] leading-tight">{t.name}</span>
          <span className="hud block mt-1.5">{t.role}</span>
        </span>
      </span>
      {link && (
        <a className="review-link hud" href={`/work/${t.slug}`}>
          Read the build <span aria-hidden>→</span>
        </a>
      )}
    </figcaption>
  )
}

/** Screenshots with a light page, toned down so they sit with the dark ones. */
const LIGHT_SHOTS = new Set(['tony-skate-club'])

/** Screenshot of the build the review is about. Versioned filename, never replaced in place. */
function Shot({ slug, featured = false }: { slug: string; featured?: boolean }) {
  const cls = ['review-shot', featured && 'review-shot--featured', LIGHT_SHOTS.has(slug) && 'review-shot--light']
    .filter(Boolean)
    .join(' ')
  return (
    <a
      href={`/work/${slug}`}
      className={cls}
      tabIndex={-1}
      aria-hidden
    >
      <img src={shotSrc(slug)} alt="" width={1440} height={900} loading="lazy" decoding="async" />
    </a>
  )
}

/** The line lifted word for word from the review. Hidden from screen readers: the full quote follows. */
function Highlight({ t, large = false }: { t: Testimonial; large?: boolean }) {
  return (
    <p className={`review-highlight display text-text${large ? ' review-highlight--lg' : ''}`} aria-hidden>
      <span className="review-mark">“</span>
      {sentence(t.highlight)}
    </p>
  )
}

/** One review on its own, used on case-study pages. */
export function TestimonialQuote({ t, link = false }: { t: Testimonial; link?: boolean }) {
  return (
    <figure className="review review--solo">
      <Highlight t={t} large />
      <blockquote className="review-body">{t.quote}</blockquote>
      <Attribution t={t} link={link} />
    </figure>
  )
}

/** All reviews: the first is featured beside its build, the rest are cards. */
export function TestimonialBand() {
  if (testimonials.length === 0) return null
  const [lead, ...rest] = testimonials
  return (
    <div className="@container">
      <figure className="review review--featured">
        <Shot slug={lead.slug} featured />
        <div className="review-featured-copy">
          <Highlight t={lead} large />
          <blockquote className="review-body">{lead.quote}</blockquote>
          <Attribution t={lead} link />
        </div>
      </figure>

      {rest.length > 0 && (
        <>
        <p className="review-swipe hud" aria-hidden>
          Swipe for more <span>→</span>
        </p>
        <ul className="review-grid" tabIndex={0} aria-label="More client reviews">
          {rest.map((t) => (
            <li key={t.slug} className="flex">
              <figure className="review review--card">
                <Shot slug={t.slug} />
                <div className="review-card-copy">
                  <Highlight t={t} />
                  <blockquote className="review-body">{t.quote}</blockquote>
                  <Attribution t={t} link />
                </div>
              </figure>
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  )
}
