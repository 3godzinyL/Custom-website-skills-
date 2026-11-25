/**
 * Administrative audit trail. Entries are append-only from the app's
 * perspective; personal data of deleted users is anonymised by users.deleteUser.
 */

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ actor?: { id: number, email: string } | null, action: string, targetType?: string, targetId?: string | number | null,
 *   targetLabel?: string | null, details?: object, ip?: string }} entry
 */
export function audit(db, entry) {
  db.run(
    `INSERT INTO audit_logs (actor_id, actor_label, action, target_type, target_id, target_label, details, ip_prefix, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.actor?.id ?? null,
    entry.actor?.email ?? 'system',
    entry.action,
    entry.targetType ?? null,
    entry.targetId == null ? null : String(entry.targetId),
    entry.targetLabel ?? null,
    JSON.stringify(entry.details ?? {}),
    entry.ip ?? '',
    Date.now(),
  );
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ action?: string, q?: string, actorId?: number, page: number, pageSize: number }} f
 */
export function listAudit(db, f) {
  const where = [];
  const params = [];
  if (f.action) {
    where.push('action LIKE ?');
    params.push(`${f.action}%`);
  }
  if (f.actorId) {
    where.push('actor_id = ?');
    params.push(f.actorId);
  }
  if (f.q) {
    where.push('(actor_label LIKE ? OR target_label LIKE ? OR action LIKE ?)');
    const like = `%${f.q.replace(/[%_]/g, '')}%`;
    params.push(like, like, like);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.get(`SELECT COUNT(*) AS n FROM audit_logs ${w}`, ...params).n;
  const rows = db
    .all(`SELECT * FROM audit_logs ${w} ORDER BY id DESC LIMIT ? OFFSET ?`, ...params, f.pageSize, (f.page - 1) * f.pageSize)
    .map((r) => ({ ...r, details: JSON.parse(r.details) }));
  return { total, rows };
}
