import asyncio
from sqlalchemy import text
from app.database import engine
from app.models import Base

async def compare_schema():
    print("=== SCHEMA COMPARISON ===")
    async with engine.begin() as conn:
        # Get all enums from Postgres
        result = await conn.execute(text("SELECT t.typname, e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid;"))
        pg_enums = {}
        for row in result.fetchall():
            typname, enumlabel = row[0], row[1]
            if typname not in pg_enums:
                pg_enums[typname] = []
            pg_enums[typname].append(enumlabel)
        
        print("PG ENUMS:", pg_enums)
        
        # Get all tables and columns from Postgres
        result = await conn.execute(text("SELECT table_name, column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public';"))
        pg_tables = {}
        for row in result.fetchall():
            table_name, column_name, data_type, udt_name = row[0], row[1], row[2], row[3]
            if table_name not in pg_tables:
                pg_tables[table_name] = {}
            pg_tables[table_name][column_name] = udt_name
            
        # Compare with SQLAlchemy models
        for table_name, table in Base.metadata.tables.items():
            if table_name not in pg_tables:
                print(f"MISSING TABLE in DB: {table_name}")
                continue
                
            db_columns = pg_tables[table_name]
            for col_name, col in table.columns.items():
                if col_name not in db_columns:
                    print(f"MISSING COLUMN in DB: {table_name}.{col_name}")
                # We could compare types too, but let's stick to existence for now

asyncio.run(compare_schema())
