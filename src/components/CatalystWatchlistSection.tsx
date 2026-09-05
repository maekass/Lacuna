import Card from "@/components/ui/Card";
import { buildCatalystWatchlistView } from "@/lib/intel/catalystWatchlistView";

function CatalystTable({
  rows,
  empty,
}: {
  rows: ReturnType<typeof buildCatalystWatchlistView>["allRows"];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-lacuna-blue/80">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-lacuna-lavender/40 text-xs uppercase tracking-wide text-lacuna-blue/70">
            <th className="px-2 py-2">Scheduled</th>
            <th className="px-2 py-2">Company</th>
            <th className="px-2 py-2">Event</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Basis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.company}-${row.drug}-${row.scheduledDate}-${row.eventType}`}
              className="border-b border-lacuna-lavender/20"
            >
              <td className="px-2 py-2 whitespace-nowrap">
                {row.scheduledDate}
                {row.actualDate
                  ? (
                    <span className="block text-[11px] text-lacuna-blue/70">
                      actual {row.actualDate}
                    </span>
                  )
                  : null}
              </td>
              <td className="px-2 py-2">
                <a
                  href={row.sourceUrl}
                  className="text-lacuna-plum underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {row.company}
                </a>
                <span className="block text-[11px] text-lacuna-blue/70">
                  {row.drug}
                </span>
              </td>
              <td className="px-2 py-2">
                {row.eventType}
                <span className="block text-[11px] text-lacuna-blue/70">
                  {row.indication}
                </span>
              </td>
              <td className="px-2 py-2">{row.status}</td>
              <td className="px-2 py-2 text-xs">
                {row.dateBasis || "—"}
                {row.datePrecision ? ` · ${row.datePrecision}` : ""}
                {row.trackedLabel
                  ? (
                    <span className="block text-[11px] text-lacuna-blue/70">
                      {row.trackedLabel}
                    </span>
                  )
                  : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Server-rendered catalyst watchlist. Reads the committed CSV only.
 */
export default function CatalystWatchlistSection() {
  const view = buildCatalystWatchlistView();
  return (
    <section id="catalyst-watchlist" className="space-y-4">
      <Card>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
          Women's-health relevant
        </h3>
        <p className="mt-1 mb-3 text-xs text-lacuna-blue/80">
          {view.whCountLabel} of {view.rowCountLabel}{" "}
          weekly catalysts are tagged women's-health relevant. The current feed
          is general biopharma; Lacuna IDs are filled only when the company is
          already in the verified universe.
        </p>
        <CatalystTable
          rows={view.womensHealthRows}
          empty="No women's-health-relevant catalysts in the current weekly feed."
        />
      </Card>
      <Card>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
          Tracked acquirers / companies · next 90 days
        </h3>
        <p className="mt-1 mb-3 text-xs text-lacuna-blue/80">
          {view.trackedCountLabel} scheduled events in {view.windowLabel}{" "}
          for Roche, J&J, GRAIL, or another verified id.
        </p>
        <CatalystTable
          rows={view.trackedRows}
          empty="No tracked-acquirer catalysts in the next 90 days."
        />
      </Card>
    </section>
  );
}
