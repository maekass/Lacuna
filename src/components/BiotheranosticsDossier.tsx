import Link from "next/link";
import {
  BIOTHERANOSTICS_CLAIMS,
  BIOTHERANOSTICS_DEAL_ID,
  BIOTHERANOSTICS_DOSSIER,
  BIOTHERANOSTICS_DOSSIER_EXPORT,
  BIOTHERANOSTICS_SOURCES,
  biotheranosticsSource,
} from "@/lib/research/biotheranosticsDossier";

const linkClass =
  "text-lacuna-plum underline decoration-lacuna-lavender underline-offset-4 hover:decoration-lacuna-plum focus-visible:outline-2 focus-visible:outline-offset-4";

/** Readable in initial HTML; evidence and limits never depend on hydration. */
export default function BiotheranosticsDossier() {
  const dossier = BIOTHERANOSTICS_DOSSIER;
  return (
    <article className="mx-auto max-w-4xl space-y-10 text-lacuna-blue">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link className={linkClass} href="/research">Research</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Biotheranostics</span>
      </nav>

      <header>
        <p className="mb-3 text-sm font-medium text-lacuna-plum">
          Research · cited public sources
        </p>
        <h1 className="text-3xl font-bold leading-tight text-lacuna-plum sm:text-4xl">
          {dossier.title}
        </h1>
        <p className="mt-4 text-sm">
          Sources checked{" "}
          <time dateTime={dossier.checkedAt}>{dossier.checkedAt}</time>
          {" · "}
          {dossier.reviewStatus}
        </p>
        <p className="mt-4 leading-relaxed">{dossier.scope}</p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
          <a className={linkClass} href="#claim-ledger">Inspect the claims</a>
          <a className={linkClass} href="#open-questions">
            See the open questions
          </a>
          <a
            className={linkClass}
            href={BIOTHERANOSTICS_DOSSIER_EXPORT}
            download
          >
            Download dossier with sources
          </a>
        </div>
      </header>

      <section
        aria-labelledby="research-question"
        className="rounded-2xl border border-lacuna-lavender/50 bg-lacuna-lavender/10 p-5 sm:p-7"
      >
        <h2
          id="research-question"
          className="text-xl font-semibold text-lacuna-plum"
        >
          {dossier.question}
        </h2>
        <p className="mt-4 text-sm font-semibold">Lacuna interpretation</p>
        <p className="mt-2 leading-relaxed">{dossier.answer}</p>
        <ul
          className="mt-4 space-y-2 text-sm"
          aria-label="Evidence supporting the interpretation"
        >
          {dossier.answerClaimIds.map((id) => {
            const claim = BIOTHERANOSTICS_CLAIMS.find((item) =>
              item.id === id
            )!;
            return (
              <li key={id}>
                <a className={linkClass} href={`#${id}`}>{claim.title}</a>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="claim-ledger" className="space-y-5">
        <h2
          id="claim-ledger"
          className="scroll-mt-24 text-2xl font-semibold text-lacuna-plum"
        >
          Claim ledger
        </h2>
        <p>
          Each claim has a date, a basis, a limitation, and a location in its
          source.
        </p>
        {BIOTHERANOSTICS_CLAIMS.map((claim) => {
          const source = biotheranosticsSource(claim.sourceId);
          return (
            <section
              key={claim.id}
              id={claim.id}
              aria-labelledby={`${claim.id}-title`}
              className="scroll-mt-24 rounded-xl border border-lacuna-lavender/50 bg-white p-5 sm:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-wide">
                {claim.kind}
              </p>
              <h3
                id={`${claim.id}-title`}
                className="mt-2 text-lg font-semibold text-lacuna-plum"
              >
                {claim.title}
              </h3>
              <p className="mt-3 leading-relaxed">{claim.statement}</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-semibold">Date / period</dt>
                  <dd>{claim.asOf}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Basis</dt>
                  <dd>{claim.basis}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Uncertainty</dt>
                  <dd>{claim.uncertainty}</dd>
                </div>
              </dl>
              <div className="mt-5 border-t border-lacuna-lavender/40 pt-4 text-sm">
                <a className={linkClass} href={source.url}>{source.title}</a>
                <p className="mt-2">
                  <span className="font-semibold">Find it:</span>{" "}
                  {claim.locator}
                </p>
                <p className="mt-2 text-xs">
                  Published / filed: {source.publishedAt ?? "not stated"}
                  {" · "}
                  Accessed: {source.accessedAt}
                  {" · "}
                  <a className={linkClass} href={`#source-${source.id}`}>
                    Source relationship
                  </a>
                </p>
              </div>
            </section>
          );
        })}
      </section>

      <section aria-labelledby="open-questions" className="space-y-5">
        <h2
          id="open-questions"
          className="scroll-mt-24 text-2xl font-semibold text-lacuna-plum"
        >
          What would establish an access gap?
        </h2>
        <p className="text-sm font-semibold">Research hypothesis · untested</p>
        <p className="leading-relaxed">{dossier.hypothesis}</p>
        {dossier.unknowns.map((gap) => (
          <section
            key={gap.title}
            className="border-l-2 border-lacuna-lavender pl-5"
          >
            <h3 className="text-lg font-semibold text-lacuna-plum">
              {gap.title}
            </h3>
            <dl className="mt-3 space-y-3 text-sm leading-relaxed">
              <div>
                <dt className="font-semibold">Missing evidence</dt>
                <dd>{gap.missing}</dd>
              </div>
              <div>
                <dt className="font-semibold">Needed next</dt>
                <dd>{gap.needed}</dd>
              </div>
              <div>
                <dt className="font-semibold">What would weaken the thesis</dt>
                <dd>{gap.disconfirmation}</dd>
              </div>
            </dl>
          </section>
        ))}
      </section>

      <section aria-labelledby="source-register" className="space-y-5">
        <h2
          id="source-register"
          className="text-2xl font-semibold text-lacuna-plum"
        >
          Source register and review status
        </h2>
        <p className="text-sm leading-relaxed">{dossier.provenance}</p>
        {BIOTHERANOSTICS_SOURCES.map((source) => (
          <div
            id={`source-${source.id}`}
            key={source.id}
            className="scroll-mt-24 border-t border-lacuna-lavender/40 pt-4 text-sm"
          >
            <a className={linkClass} href={source.url}>{source.title}</a>
            <p className="mt-2">{source.publisher}</p>
            <p className="mt-2">
              Published / filed: {source.publishedAt ?? "not stated"}.{" "}
              {source.publicationBasis}.
            </p>
            <p className="mt-2">
              Accessed: {source.accessedAt}. Source group: {source.sourceGroup}.
            </p>
            <p className="mt-2">{source.relationship}</p>
          </div>
        ))}
      </section>

      <footer className="flex flex-wrap gap-5 border-t border-lacuna-lavender/40 pt-5 text-sm">
        <Link className={linkClass} href={`/deals/${BIOTHERANOSTICS_DEAL_ID}`}>
          Related curated deal record
        </Link>
        <Link className={linkClass} href="/research">Research workspace</Link>
        <a className={linkClass} href={BIOTHERANOSTICS_DOSSIER_EXPORT} download>
          Download dossier with sources
        </a>
      </footer>
    </article>
  );
}
