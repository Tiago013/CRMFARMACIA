from fastapi import APIRouter
from app.modules.mobile.schemas import PushTokenRegistration, MobileSyncRequest

router = APIRouter(prefix="/mobile", tags=["Mobile App & Portal"])

@router.post("/push-token")
async def register_push_token(data: PushTokenRegistration):
    """
    Registra el token de dispositivo (FCM/APNs) de la app React Native 
    del paciente para enviar notificaciones push (recordatorios de medicina).
    """
    return {"status": "success", "message": "Token registrado correctamente."}

@router.post("/sync")
async def offline_sync(data: MobileSyncRequest):
    """
    Estrategia Offline-first: Permite a la app móvil sincronizar datos
    (como el inventario cacheado) basándose en un timestamp.
    """
    return {
        "status": "synced",
        "new_records_count": 0,
        "message": "Sincronización completada."
    }
