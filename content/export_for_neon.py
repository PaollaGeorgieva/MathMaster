"""Export official learning content for a Neon database with empty content tables."""
from datetime import datetime
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def sql_value(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, datetime):
        value = value.isoformat()
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    raise TypeError(f"Unsupported content value: {type(value).__name__}")


def render_sql(tables):
    names = ', '.join(f'"{name}"' for name in tables)
    statements = [
        '-- Official learning content only. Existing accounts and progress are preserved.',
        'BEGIN;',
        'SET LOCAL standard_conforming_strings = on;',
        "SET LOCAL lock_timeout = '10s';",
        f'LOCK TABLE {names} IN SHARE ROW EXCLUSIVE MODE;',
        'DO $guard$ BEGIN',
    ]
    for name in tables:
        statements.append(
            f'IF EXISTS (SELECT 1 FROM "{name}") THEN '
            f"RAISE EXCEPTION 'Content table {name} is not empty; import cancelled.'; END IF;"
        )
    statements.append('END; $guard$;')
    for name, rows in tables.items():
        statements.append(f'-- {name}: {len(rows)} rows')
        for row in rows:
            columns = ', '.join(f'"{column}"' for column in row)
            values = ', '.join(sql_value(value) for value in row.values())
            statements.append(f'INSERT INTO "{name}" ({columns}) VALUES ({values});')
    for name, rows in tables.items():
        if rows:
            statements.append(
                f"SELECT setval(pg_get_serial_sequence('{name}', 'id'), "
                f'(SELECT MAX(id) FROM "{name}"), true);'
            )
    statements.append('COMMIT;')
    statements.append(' UNION ALL '.join(
        f"SELECT '{name}' AS content_table, COUNT(*) AS rows FROM \"{name}\""
        for name in tables
    ) + ';')
    return '\n'.join(statements) + '\n'


def main():
    from sqlalchemy import select
    from database import engine
    from models import Theme, Level, Theory, ExampleProblem, Problem, ThemeTest, TestQuestion, TestQuestionAnswer

    models = (Theme, Level, Theory, ExampleProblem, Problem, ThemeTest, TestQuestion, TestQuestionAnswer)
    tables = {}
    with engine.connect().execution_options(isolation_level='REPEATABLE READ') as connection:
        with connection.begin():
            connection.exec_driver_sql('SET TRANSACTION READ ONLY')
            for model in models:
                table = model.__table__
                query = select(table).order_by(table.c.id)
                if model is Problem:
                    query = query.where(table.c.is_official.is_(True))
                rows = [dict(row) for row in connection.execute(query).mappings()]
                if model is Problem:
                    for row in rows:
                        row['created_by_id'] = None
                tables[table.name] = rows

    if not tables['themes']:
        raise ValueError('The source database has no themes.')
    ids = {name: {row['id'] for row in rows} for name, rows in tables.items()}
    for model in models:
        for fk in model.__table__.foreign_keys:
            for row in tables[model.__tablename__]:
                value = row[fk.parent.name]
                if value is not None and value not in ids.get(fk.column.table.name, set()):
                    raise ValueError(f'Missing content reference: {model.__tablename__}.{fk.parent.name}')

    output = ROOT / 'content' / 'neon_content.sql'
    output.write_text(render_sql(tables), encoding='utf-8')
    for name, rows in tables.items():
        print(f'{name}: {len(rows)}')
    print(f'Exported to {output}')


if __name__ == '__main__':
    main()
