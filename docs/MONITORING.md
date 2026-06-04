# Uptime monitoring

**Use `GET /api/health` for all recurring uptime checks.** Do not poll `/api/health/ready` on a schedule.

| Endpoint | Use for |
| --- | --- |
| `GET /api/health` | **Uptime / synthetics / load balancers** (every 1–5 min is fine) |
| `GET /api/health/ready` | **Deploy smoke only** (after release or migration; manual or CI once) |

## Production URL

```text
https://lacuna-maekass.vercel.app/api/health
```

## Expected response

HTTP **200** and JSON:

```json
{
  "ok": true,
  "service": "lacuna",
  "probe": "live",
  "version": "0.1.0",
  "dataMode": "static",
  "timestamp": "2026-06-04T12:00:00.000Z",
  "buildSha": "…"
}
```

Assert: `ok === true` and `probe === "live"`. Do **not** require `checks.dataset` — that field exists only on `/api/health/ready`.

## Why not `/api/health/ready`?

Readiness loads and validates the full dataset (and may query Postgres in db mode). Running it every 30–60s wastes CPU, DB connections, and serverless invocations without improving uptime signal. Liveness answers: “Is the app process up?”

## Provider examples

### curl (cron on a bastion or CI smoke)

```bash
curl -sf "https://lacuna-maekass.vercel.app/api/health" | jq -e '.ok == true and .probe == "live"'
```

### Datadog Synthetic (API test)

- **Method:** GET  
- **URL:** `https://lacuna-maekass.vercel.app/api/health`  
- **Assertion:** status code 200, body contains `"probe":"live"` (or JSON path `$.ok` equals `true`)  
- **Interval:** 5m (or 1m if you need fast detection)  
- **Tag:** `lacuna`, `liveness` (not `readiness`)

Repository workflow [`.github/workflows/datadog-synthetics.yml`](../.github/workflows/datadog-synthetics.yml) runs tests tagged in Datadog; ensure those tests target `/api/health`, not `/ready`.

### UptimeRobot / Better Stack / Pingdom

- Monitor type: HTTP(s)  
- URL: `https://lacuna-maekass.vercel.app/api/health`  
- Keyword (optional): `"probe":"live"` or `"ok":true`  
- Interval: 5 minutes  

### Vercel Deployment Protection

If the project uses [Vercel Deployment Protection](https://vercel.com/docs/security/deployment-protection), external monitors will get **401** HTML unless you:

- Add a **Protection Bypass for Automation** secret and pass it as `x-vercel-protection-bypass` on monitor requests, or  
- Exempt `/api/health` from protection (recommended for public liveness).

After merge, confirm: `curl -sS https://lacuna-maekass.vercel.app/api/health` returns JSON with `"probe":"live"`, not an SSO redirect.

### Vercel (external)

Vercel does not ship uptime polling. Use Datadog, Better Stack, or UptimeRobot against `/api/health` as above.

## After deploy (one-time readiness)

```bash
curl -sf "https://lacuna-maekass.vercel.app/api/health/ready" | jq .
```

Run once after env changes, `db:migrate`, or `db:import` — not on the same schedule as uptime.

## Related

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — full ops map  
- [PERFORMANCE.md](./PERFORMANCE.md) — probe design rationale  
