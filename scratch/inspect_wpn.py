import sqlite3
import os
import shutil
import tempfile
import sys

sys.stdout.reconfigure(encoding='utf-8')

db_path = os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\Windows\Notifications\wpndatabase.db')
temp_db = os.path.join(tempfile.gettempdir(), 'wpn_inspect.db')

shutil.copy2(db_path, temp_db)
conn = sqlite3.connect(temp_db)
c = conn.cursor()

print("=== Handlers matching localhost, Chrome, Edge ===")
c.execute("SELECT RecordId, PrimaryId, HandlerType FROM NotificationHandler WHERE PrimaryId LIKE '%5173%' OR PrimaryId LIKE '%Chrome%' OR PrimaryId LIKE '%Edge%';")
handlers = c.fetchall()
for h in handlers:
    print(h)

handler_ids = [h[0] for h in handlers]
if handler_ids:
    placeholders = ','.join('?' * len(handler_ids))
    print("\n=== Recent Notifications for these handlers ===")
    c.execute(f"SELECT Id, HandlerId, Type, Payload, ArrivalTime, Tag FROM Notification WHERE HandlerId IN ({placeholders}) ORDER BY ArrivalTime DESC LIMIT 15;", handler_ids)
    for n in c.fetchall():
        payload_preview = n[3].decode('utf-8', errors='ignore') if isinstance(n[3], bytes) else str(n[3])
        print(f"Notification ID: {n[0]}, Handler: {n[1]}, Type: {n[2]}, Time: {n[4]}, Tag: {n[5]}")
        # Clean XML/JSON preview
        clean_text = ' '.join(payload_preview.split())
        print(f"Payload: {clean_text[:250]}")

print("\n=== HandlerSettings for these handlers ===")
if handler_ids:
    c.execute(f"SELECT * FROM HandlerSettings WHERE HandlerId IN ({placeholders});", handler_ids)
    for s in c.fetchall():
        print(s)

conn.close()


