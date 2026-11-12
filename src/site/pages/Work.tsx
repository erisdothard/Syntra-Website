import { projects, testimonials } from '../../data/portfolio'
import { TestimonialQuote } from '../../components/Testimonials'
import { caseStudies, start, workPage } from '../content'
import type { CaseStudy as CaseStudyContent } from '../content'
import { Band, ClosingBand, PageHero, PointList } from '../SiteLayout'

/** Screenshot of the live build. Versioned filename: replace by adding -v2, never in place. */
function Shot({ slug, name, eager = false }: { slug: string; name: string; eager?: boolean }) {
  return (
    <img
      className="site-shot"
      src={`/img/work-${slug}-v1.jpg`}
      alt={`The ${name} site as it runs in production`}
      width={1440}
      height={900}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}

export function Work() {
  return (
    <>
      <PageHero eyebrow={workPage.eyebrow} headline={workPage.headline} lead={workPage.lead} prices compact />
      <section className="px-6 md:px-12 lg:px-16 border-t border-border">
        <ul className="max-w-[1400px] mx-auto flex flex-col divide-y divide-border">
          {caseStudies.map((c, i) => {
            const project = projects.find((p) => p.title === c.project)
            return (
              <li key={c.slug} className="py-12 md:py-16 grid lg:grid-cols-[minmax(0,0.7fr)_minmax(0,2fr)] gap-x-16 gap-y-5">
                <div>
                  <p className="mono-label mb-3">0{i + 1}</p>
                  <p className="hud mb-6">{c.kind}</p>
                  <a href={`/work/${c.slug}`} className="block max-w-sm" tabIndex={-1} aria-hidden>
                    <Shot slug={c.slug} name={c.project} />
                  </a>
                </div>
                <div>
                  <h2 className="display text-text" style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.6rem)', lineHeight: 1.05 }}>
                    <a href={`/work/${c.slug}`} className="hover:text-accent transition-colors duration-300">
                      {c.project}
                    </a>
                  </h2>
                  <p className="mt-5 max-w-2xl text-base md:text-lg text-text-secondary leading-relaxed">{c.headline}</p>
                  <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4">
                    <a className="btn-ghost offer-link" href={`/work/${c.slug}`}>
                      Read the build <span aria-hidden>→</span>
                    </a>
                    {project?.live && (
                      <a className="btn-ghost" href={project.live} target="_blank" rel="noopener noreferrer">
                        Visit the live site <span aria-hidden>↗</span>
                      </a>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
      <ClosingBand text={start.closing} place="work-closing" />
    </>
  )
}

export function CaseStudy({ study }: { study: CaseStudyContent }) {
  const project = projects.find((p) => p.title === study.project)
  const others = caseStudies.filter((c) => c.slug !== study.slug)
  const quote = testimonials.find((t) => t.slug === study.slug)
  return (
    <>
      <PageHero eyebrow={study.kind} headline={study.headline} lead={study.job}>
        {project?.live && (
          <a className="btn-primary" href={project.live} target="_blank" rel="noopener noreferrer">
            <span>Visit the live site</span>
            <span aria-hidden>↗</span>
          </a>
        )}
        <a className="btn-ghost" href="/work">
          <span aria-hidden>←</span> All shipped work
        </a>
      </PageHero>

      <section className="px-6 md:px-12 lg:px-16 pb-16 md:pb-24">
        <figure className="max-w-[1400px] mx-auto">
          <Shot slug={study.slug} name={study.project} eager />
          {project?.live && (
            <figcaption className="hud mt-4">Live at {project.live.replace(/^https?:\/\/(www\.)?/, '')}</figcaption>
          )}
        </figure>
      </section>

      {quote && (
        <section className="px-6 md:px-12 lg:px-16 pb-16 md:pb-24">
          <div className="max-w-[1400px] mx-auto">
            <div className="max-w-4xl"><TestimonialQuote t={quote} /></div>
          </div>
        </section>
      )}

      <Band n="01" title="What was built">
        <PointList points={study.built} />
      </Band>

      {study.mechanism && study.mechanismTitle && (
        <Band n="02" title={study.mechanismTitle}>
          <ul className="flex flex-col divide-y divide-border border-t border-border">
            {study.mechanism.map((m) => (
              <li key={m} className="py-5 text-base md:text-lg text-text leading-relaxed max-w-3xl">
                {m}
              </li>
            ))}
          </ul>
        </Band>
      )}

      <Band n={study.mechanism ? '03' : '02'} title="Stack and ownership">
        {project && <p className="hud leading-loose max-w-3xl">{project.stack}</p>}
        <p className="mt-6 text-base md:text-lg text-text-secondary leading-relaxed max-w-2xl">{study.ownedBy}</p>
      </Band>

      <Band n={study.mechanism ? '04' : '03'} title="More shipped work">
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {others.map((c) => (
            <li key={c.slug}>
              <a href={`/work/${c.slug}`} className="group flex flex-wrap items-baseline justify-between gap-x-10 gap-y-2 py-6">
                <span className="display text-text text-lg md:text-xl group-hover:text-accent transition-colors duration-300">{c.project}</span>
                <span className="hud group-hover:text-text transition-colors">{c.kind}</span>
              </a>
            </li>
          ))}
        </ul>
      </Band>

      <ClosingBand text={start.closing} place={`case-${study.slug}`} />
    </>
  )
}
