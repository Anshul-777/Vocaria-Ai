import sqlite3
import json

db_path = "dev.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE detection_jobs ADD COLUMN pipeline_metrics JSON;")
    print("Column pipeline_metrics added successfully.")
except sqlite3.OperationalError as e:
    print(f"Error (might already exist): {e}")

conn.commit()
conn.close()
