import asyncio
from arq import cron
from arq.connections import RedisSettings
from app.core.config import settings

# Import our tasks
from app.tasks.inventory_tasks import check_expiring_batches
from app.tasks.crm_tasks import send_patient_reminders

# arq requires RedisSettings to be configured
# We parse the standard redis URL to feed it to arq
import urllib.parse
url = urllib.parse.urlparse(settings.REDIS_URL)
redis_settings = RedisSettings(
    host=url.hostname or 'localhost',
    port=url.port or 6379,
    database=int(url.path.lstrip('/') or '0')
)

async def startup(ctx):
    print("Worker started. Connecting to DB and initializing services...")
    # Here we would initialize the DB engine to be available in ctx
    pass

async def shutdown(ctx):
    print("Worker shutting down...")
    pass

class WorkerSettings:
    redis_settings = redis_settings
    on_startup = startup
    on_shutdown = shutdown
    
    # We register standard background functions here
    functions = [
        check_expiring_batches,
        send_patient_reminders
    ]
    
    # We can also register cron jobs!
    cron_jobs = [
        # Check for expiring batches every day at 8:00 AM
        cron(check_expiring_batches, hour=8, minute=0),
        
        # Send CRM reminders every day at 9:00 AM
        cron(send_patient_reminders, hour=9, minute=0)
    ]
