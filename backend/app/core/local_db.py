"""
Conexión directa a la base de datos SQLite local (farmaai_local.db).
Usada por los módulos que necesitan leer datos reales sin depender de PostgreSQL.
"""
import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).parent.parent.parent / "farmaai_local.db"

@contextmanager
def get_sqlite():
    """Context manager para obtener una conexión SQLite con row_factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def query_all(sql: str, params: tuple = ()) -> list[dict]:
    """Ejecuta un SELECT y retorna todas las filas como lista de dicts."""
    with get_sqlite() as conn:
        cursor = conn.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]

def query_one(sql: str, params: tuple = ()) -> dict | None:
    """Ejecuta un SELECT y retorna la primera fila como dict."""
    with get_sqlite() as conn:
        cursor = conn.execute(sql, params)
        row = cursor.fetchone()
        return dict(row) if row else None
