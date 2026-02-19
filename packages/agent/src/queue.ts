import Database from "better-sqlite3";

export type QueueItem =
  | { kind: "heartbeat"; path: string; body: any }
  | { kind: "ingest"; path: string; body: any };

export const createQueue = (dbPath: string) => {
  const db = new Database(dbPath);
  db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      path TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  const enqueueStmt = db.prepare("INSERT INTO queue (kind, path, body, created_at) VALUES (?, ?, ?, ?)");
  const peekStmt = db.prepare("SELECT id, kind, path, body FROM queue ORDER BY id LIMIT 1");
  const delStmt = db.prepare("DELETE FROM queue WHERE id = ?");

  return {
    enqueue: (item: QueueItem) => enqueueStmt.run(item.kind, item.path, JSON.stringify(item.body), Date.now()),
    peek: (): { id: number; kind: QueueItem["kind"]; path: string; body: any } | null => {
      const row = peekStmt.get() as any;
      if (!row) return null;
      return { id: row.id, kind: row.kind, path: row.path, body: JSON.parse(row.body) };
    },
    remove: (id: number) => delStmt.run(id)
  };
};
