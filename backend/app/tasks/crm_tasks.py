import asyncio

async def send_patient_reminders(ctx, patient_id: str = None, message: str = None):
    """
    Background job to send reminders to patients via WhatsApp or Email.
    Can be called manually (enqueued) or run as a cron job to find patients 
    who bought chronic medications 25 days ago.
    """
    print(f"[WORKER] Executing send_patient_reminders...")
    if patient_id:
        print(f"[WORKER] Sending direct message to {patient_id}: {message}")
    else:
        print("[WORKER] Running daily retention scan...")
        # 1. Query CRM for patients who bought chronic meds (e.g. Losartan) ~30 days ago
        # 2. Integrate with WhatsApp API to send: "Hola Juan, tu Losartán debe estar por terminarse..."
    
    await asyncio.sleep(1) # Simulate API call
    print("[WORKER] Finished sending patient reminders.")
    return "success"
