import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Thin wrapper around node:sqlite with a statement cache and nested
 * transactions (savepoints). Every query in the app goes through it, so
 * swapping the driver (better-sqlite3, Postgres adapter) stays local.
 */
export class Db {
  /** @param {string} file */
  constructor(file) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.raw = new DatabaseSync(file);
    this.raw.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      PRAGMA synchronous = NORMAL;
    `);
    /** @type {Map<string, import('node:sqlite').StatementSync>} */
    this.cache = new Map();
    this.depth = 0;
  }

  /** @param {string} sql */
  stmt(sql) {
    let s = this.cache.get(sql);
    if (!s) {
      s = this.raw.prepare(sql);
      this.cache.set(sql, s);
    }
    return s;
  }

  /** @param {unknown[]} params */
  static norm(params) {
    return params.map((p) => {
      if (p === undefined) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p !== null && typeof p === 'object' && !(p instanceof Uint8Array)) {
        /** @type {Record<string, unknown>} */
        const out = {};
        for (const [k, v] of Object.entries(p)) out[k] = v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v;
        return out;
      }
      return p;
    });
  }

  /** @param {string} sql @param {...any} params @returns {any} */
  get(sql, ...params) {
    return this.stmt(sql).get(...(/** @type {any[]} */ (Db.norm(params))));
  }

  /** @param {string} sql @param {...any} params @returns {any[]} */
  all(sql, ...params) {
    return this.stmt(sql).all(...(/** @type {any[]} */ (Db.norm(params))));
  }

  /** @param {string} sql @param {...any} params */
  run(sql, ...params) {
    const r = this.stmt(sql).run(...(/** @type {any[]} */ (Db.norm(params))));
    return { changes: Number(r.changes), lastId: Number(r.lastInsertRowid) };
  }

  /** @param {string} sql */
  exec(sql) {
    this.raw.exec(sql);
  }

  /**
   * Runs fn inside a transaction. Nested calls use savepoints.
   * @template T
   * @param {() => T} fn
   * @returns {T}
   */
  tx(fn) {
    const sp = `sp_${this.depth}`;
    if (this.depth === 0) this.raw.exec('BEGIN IMMEDIATE');
    else this.raw.exec(`SAVEPOINT ${sp}`);
    this.depth += 1;
    try {
      const result = fn();
      this.depth -= 1;
      if (this.depth === 0) this.raw.exec('COMMIT');
      else this.raw.exec(`RELEASE ${sp}`);
      return result;
    } catch (err) {
      this.depth -= 1;
      if (this.depth === 0) this.raw.exec('ROLLBACK');
      else this.raw.exec(`ROLLBACK TO ${sp}; RELEASE ${sp}`);
      throw err;
    }
  }

  close() {
    this.cache.clear();
    this.raw.close();
  }
}

/** @param {string} file */
export function openDb(file) {
  return new Db(file);
}
