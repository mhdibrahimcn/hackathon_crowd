from datetime import datetime, timedelta
import storage

def cleanup_stale_users(max_age=30):
    """Remove users who haven't sent heartbeat recently"""
    active_users = storage.storage.active_users
    cutoff = datetime.now() - timedelta(seconds=max_age)
    stale = [uid for uid, d in active_users.items() if d.get("timestamp", datetime.min) < cutoff]
    for uid in stale:
        if uid in active_users:
            del active_users[uid]
    return stale
