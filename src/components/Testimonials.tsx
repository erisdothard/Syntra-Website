import { testimonials } from '../data/portfolio'
import type { Testimonial } from '../data/portfolio'

/** One client quote, with who said it. `link` adds a route to the build it is about. */
export function TestimonialQuote({ t, link = false }: { t: Testimonial; link?: boolean }) {
  return (
    <figure className="quote">
      <blockquote className="display text-text">
        <span aria-hidden className="quote-mark">“</span>
        {t.quote}
      </blockquote>
      <figcaption className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="text-text text-sm md:text-[15px]">{t.name}</span>
        <span className="hud">{t.role}</span>
        {link && (
          <a className="hud hover:text-text transition-colors" href={`/work/${t.slug}`}>
            Read the build →
          </a>
        )}
      </figcaption>
    </figure>
  )
}

/** Every testimonial, side by side. Renders nothing when there are none. */
export function TestimonialBand() {
  if (testimonials.length === 0) return null
  return (
    <div className="grid lg:grid-cols-[1.35fr_1fr] gap-x-16 gap-y-12">
      {testimonials.map((t) => (
        <TestimonialQuote key={t.slug} t={t} link />
      ))}
    </div>
  )
}
