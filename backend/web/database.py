from __future__ import annotations

import sqlite3
import uuid
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent / "data.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS folders (
                id         TEXT PRIMARY KEY,
                name       TEXT NOT NULL,
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS test_cases (
                id             TEXT PRIMARY KEY,
                folder_id      TEXT REFERENCES folders(id) ON DELETE SET NULL,
                name           TEXT NOT NULL,
                url            TEXT NOT NULL,
                method         TEXT NOT NULL DEFAULT 'GET',
                headers        TEXT NOT NULL DEFAULT '{}',
                params         TEXT NOT NULL DEFAULT '{}',
                body           TEXT NOT NULL DEFAULT 'null',
                generated_code TEXT,
                created_at     TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS test_runs (
                id              TEXT PRIMARY KEY,
                test_case_id    TEXT NOT NULL,
                status          TEXT NOT NULL DEFAULT 'pending',
                total           INTEGER DEFAULT 0,
                passed          INTEGER DEFAULT 0,
                failed          INTEGER DEFAULT 0,
                output          TEXT DEFAULT '',
                started_at      TEXT NOT NULL,
                finished_at     TEXT,
                FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE
            );
        """)
        # Migrations
        folder_cols = [r[1] for r in conn.execute("PRAGMA table_info(folders)")]
        if "is_default" not in folder_cols:
            conn.execute("ALTER TABLE folders ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0")

        tc_cols = [r[1] for r in conn.execute("PRAGMA table_info(test_cases)")]
        if "folder_id" not in tc_cols:
            conn.execute("ALTER TABLE test_cases ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL")

        # Ensure default folder always exists
        exists = conn.execute("SELECT 1 FROM folders WHERE is_default=1").fetchone()
        if not exists:
            conn.execute(
                "INSERT INTO folders (id, name, is_default, created_at) VALUES (?, ?, 1, ?)",
                ("default", "Default", datetime.utcnow().isoformat())
            )


# ── Folders ───────────────────────────────────────────────────────────────────

def create_folder(name: str) -> dict:
    fid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute("INSERT INTO folders (id, name, created_at) VALUES (?, ?, ?)", (fid, name, now))
    return {"id": fid, "name": name, "created_at": now}


def rename_folder(fid: str, name: str):
    with get_conn() as conn:
        conn.execute("UPDATE folders SET name=? WHERE id=?", (name, fid))


def delete_folder(fid: str):
    with get_conn() as conn:
        row = conn.execute("SELECT is_default FROM folders WHERE id=?", (fid,)).fetchone()
        if row and row["is_default"]:
            return  # default folder cannot be deleted
        conn.execute("DELETE FROM folders WHERE id=?", (fid,))


def get_folders_with_cases() -> list[dict]:
    with get_conn() as conn:
        folders = [dict(r) for r in conn.execute(
            "SELECT * FROM folders ORDER BY is_default DESC, created_at ASC"
        )]
        cases = [dict(r) for r in conn.execute(
            "SELECT id, folder_id, name, url, method FROM test_cases ORDER BY created_at ASC"
        )]

    case_map: dict[str | None, list] = {}
    for c in cases:
        key = c["folder_id"]
        case_map.setdefault(key, []).append(c)

    for f in folders:
        f["test_cases"] = case_map.get(f["id"], [])

    uncategorized = case_map.get(None, [])
    return {"folders": folders, "uncategorized": uncategorized}


# ── Test Cases ────────────────────────────────────────────────────────────────

def save_test_case(name: str, url: str, method: str, headers: dict,
                   params: dict, body, generated_code: str,
                   folder_id: str | None = None) -> tuple[str, bool]:
    """Returns (tc_id, created). created=False means an existing record was updated."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM test_cases WHERE name=? AND url=?", (name, url)
        ).fetchone()

        if row:
            tc_id = row["id"]
            conn.execute(
                """UPDATE test_cases
                   SET method=?, headers=?, params=?, body=?, generated_code=?, folder_id=?
                   WHERE id=?""",
                (method, json.dumps(headers), json.dumps(params), json.dumps(body),
                 generated_code, folder_id, tc_id)
            )
            return tc_id, False

        tc_id = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO test_cases
               (id, folder_id, name, url, method, headers, params, body, generated_code, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (tc_id, folder_id, name, url, method,
             json.dumps(headers), json.dumps(params), json.dumps(body),
             generated_code, datetime.utcnow().isoformat())
        )
        return tc_id, True


def get_test_case(tc_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM test_cases WHERE id = ?", (tc_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    d["headers"] = json.loads(d["headers"])
    d["params"]  = json.loads(d["params"])
    d["body"]    = json.loads(d["body"])
    return d


def delete_test_case(tc_id: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM test_cases WHERE id = ?", (tc_id,))


def move_test_case(tc_id: str, folder_id: str | None):
    with get_conn() as conn:
        conn.execute("UPDATE test_cases SET folder_id=? WHERE id=?", (folder_id, tc_id))


# ── Test Runs ─────────────────────────────────────────────────────────────────

def create_run(test_case_id: str) -> str:
    run_id = str(uuid.uuid4())
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO test_runs (id, test_case_id, status, started_at) VALUES (?, ?, 'running', ?)",
            (run_id, test_case_id, datetime.utcnow().isoformat())
        )
    return run_id


def finish_run(run_id: str, status: str, total: int, passed: int, failed: int, output: str):
    with get_conn() as conn:
        conn.execute(
            """UPDATE test_runs SET status=?, total=?, passed=?, failed=?,
               output=?, finished_at=? WHERE id=?""",
            (status, total, passed, failed, output, datetime.utcnow().isoformat(), run_id)
        )


def get_history() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT r.*, t.name, t.url, t.method
            FROM test_runs r
            JOIN test_cases t ON t.id = r.test_case_id
            ORDER BY r.started_at DESC
        """).fetchall()
    return [dict(r) for r in rows]


def get_run(run_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM test_runs WHERE id = ?", (run_id,)).fetchone()
    return dict(row) if row else None


def delete_run(run_id: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM test_runs WHERE id = ?", (run_id,))


init_db()
