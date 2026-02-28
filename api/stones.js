const { neon } = require("@neondatabase/serverless");

function getClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  return neon(connectionString);
}

async function ensureTable(sql) {
  await sql`
    create table if not exists stones (
      stone_id text primary key,
      weight_tons numeric not null,
      stone_date date not null,
      created_at timestamptz not null default now()
    );
  `;
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    const sql = getClient();
    await ensureTable(sql);

    if (req.method === "GET") {
      const stoneId = typeof req.query.stoneId === "string" ? req.query.stoneId.trim() : "";

      if (stoneId) {
        const rows = await sql`
          select stone_id, weight_tons, stone_date, created_at
          from stones
          where stone_id = ${stoneId}
          limit 1;
        `;

        const first = rows[0];
        if (!first) {
          res.statusCode = 404;
          res.end(JSON.stringify({ record: null }));
          return;
        }

        res.statusCode = 200;
        res.end(JSON.stringify({ record: mapRow(first) }));
        return;
      }

      const rows = await sql`
        select stone_id, weight_tons, stone_date, created_at
        from stones
        order by created_at desc
        limit 1000;
      `;

      res.statusCode = 200;
      res.end(JSON.stringify({ records: rows.map(mapRow) }));
      return;
    }

    if (req.method === "POST") {
      const body = parseBody(req.body);
      const stoneId = typeof body.stoneId === "string" ? body.stoneId.trim() : "";
      const weight = Number.parseFloat(body.weight);
      const date = typeof body.date === "string" ? body.date : "";
      const createdAt = typeof body.createdAt === "string" && body.createdAt ? body.createdAt : new Date().toISOString();

      if (!stoneId || Number.isNaN(weight) || !date) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "stoneId, weight, and date are required" }));
        return;
      }

      await sql`
        insert into stones (stone_id, weight_tons, stone_date, created_at)
        values (${stoneId}, ${weight}, ${date}, ${createdAt})
        on conflict (stone_id)
        do update set
          weight_tons = excluded.weight_tons,
          stone_date = excluded.stone_date;
      `;

      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message || "Server error" }));
  }
};

function mapRow(row) {
  return {
    stoneId: row.stone_id,
    weight: Number(row.weight_tons),
    date: String(row.stone_date),
    createdAt: row.created_at,
  };
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "object") return body;

  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}
