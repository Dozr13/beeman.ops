import type { FastifyInstance } from 'fastify'

const ROLLUP_EVERY_MS = 10 * 60 * 1000 // 10 minutes
const WINDOW_DAYS = 8 // slightly > 7 days to cover boundary/clock skew

const floorToHour = (d: Date) => {
  const x = new Date(d)
  x.setMinutes(0, 0, 0)
  return x
}

export const startMetricRollups = (app: FastifyInstance) => {
  const tick = async () => {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const sinceHour = floorToHour(since)

    await app.prisma.$executeRawUnsafe(`
      WITH base AS (
        SELECT
          "deviceId",
          date_trunc('hour', "ts") AS "hour",
          "ts",
          "payload",
          NULLIF(("payload"->>'ghs_av')::double precision, NULL) AS ghs_av,
          NULLIF(("payload"->>'ghs_5s')::double precision, NULL) AS ghs_5s,
          NULLIF(("payload"->>'temp_max')::double precision, NULL) AS temp_max
        FROM "Metric"
        WHERE "ts" >= '${sinceHour.toISOString()}'
      ),
      agg AS (
        SELECT
          "deviceId",
          "hour",
          AVG(ghs_av) AS ghs_av_avg,
          AVG(ghs_5s) AS ghs_5s_avg,
          MAX(temp_max) AS temp_max_max
        FROM base
        GROUP BY "deviceId", "hour"
      ),
      last_payload AS (
        SELECT DISTINCT ON ("deviceId","hour")
          "deviceId",
          "hour",
          "payload"
        FROM base
        ORDER BY "deviceId","hour","ts" DESC
      )
      INSERT INTO "MetricHour" ("id","deviceId","hour","payload")
      SELECT
        gen_random_uuid()::text,
        a."deviceId",
        a."hour",
        jsonb_set_lax(
          jsonb_set_lax(
            jsonb_set_lax(
              COALESCE(NULLIF(lp."payload"::jsonb, 'null'::jsonb), '{}'::jsonb),
              '{rollup,ghs_av_avg}',
              to_jsonb(a.ghs_av_avg),
              true,
              'use_json_null'
            ),
            '{rollup,ghs_5s_avg}',
            to_jsonb(a.ghs_5s_avg),
            true,
            'use_json_null'
          ),
          '{rollup,temp_max_max}',
          to_jsonb(a.temp_max_max),
          true,
          'use_json_null'
        )
      FROM agg a
      JOIN last_payload lp
        ON lp."deviceId" = a."deviceId" AND lp."hour" = a."hour"
      ON CONFLICT ("deviceId","hour")
      DO UPDATE SET "payload" = EXCLUDED."payload";
    `)
  }
  const safeTick = async () => {
    try {
      await tick()
    } catch (e) {
      app.log.error({ err: e }, '[rollup] failed')
    }
  }

  void safeTick()
  setInterval(() => void safeTick(), ROLLUP_EVERY_MS)
}
