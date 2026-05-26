from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.core.usage import UsageService
import os
# import stripe (we would import stripe here, but we use a mock for now)

router = APIRouter(prefix="/billing", tags=["Billing"])

# Stripe mock initialization
# stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@router.get("/usage")
def get_usage(current_user = Depends(get_current_user)):
    tenant_id = current_user.get("tenant_id", current_user.get("id"))
    usage = UsageService.get_usage(tenant_id)
    return usage

@router.post("/checkout-session")
def create_checkout_session(plan_slug: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Creates a Stripe checkout session for a specific plan.
    Mocked for development.
    """
    tenant_id = current_user.get("tenant_id", current_user.get("id"))
    # 1. Get plan from DB
    # plan = db.query(SubscriptionPlan).filter_by(slug=plan_slug).first()
    # 2. Create Stripe Checkout Session
    # session = stripe.checkout.Session.create(...)
    return {"checkout_url": "https://checkout.stripe.com/pay/mock_session"}

@router.post("/portal-session")
def create_portal_session(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Creates a Stripe Customer Portal session.
    Mocked for development.
    """
    tenant_id = current_user.get("tenant_id", current_user.get("id"))
    # 1. Get subscription / stripe_customer_id
    # 2. session = stripe.billing_portal.Session.create(customer=customer_id)
    return {"portal_url": "https://billing.stripe.com/p/session/mock_portal"}

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe webhook to receive events.
    Handles 'checkout.session.completed', 'invoice.payment_failed', 'customer.subscription.deleted'.
    """
    from app.core.local_db import query_one, execute_write
    import json
    
    payload = await request.body()
    # In a real scenario we use stripe.Webhook.construct_event
    # We will simulate valid payload extraction for this demo.
    try:
        data = json.loads(payload.decode('utf-8'))
        event_id = data.get("id", "mock_event_id")
        event_type = data.get("type")
        event_data = data.get("data", {}).get("object", {})
    except BaseException:
        raise HTTPException(status_code=400, detail="Invalid payload")

    # Idempotency check
    existing = query_one("SELECT id FROM event_log WHERE id = ?", (event_id,))
    if existing:
        return {"status": "success", "message": "Already processed"}

    # Process events
    if event_type == "checkout.session.completed":
        tenant_id = event_data.get("client_reference_id")
        customer_id = event_data.get("customer")
        sub_id = event_data.get("subscription")
        if tenant_id:
            execute_write(
                "UPDATE pharmacies SET status = 'Saludable', stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?",
                (customer_id, sub_id, tenant_id)
            )
            
    elif event_type == "invoice.payment_failed":
        customer_id = event_data.get("customer")
        if customer_id:
            execute_write(
                "UPDATE pharmacies SET status = 'Riesgo Churn' WHERE stripe_customer_id = ?",
                (customer_id,)
            )
            
    elif event_type == "customer.subscription.deleted":
        customer_id = event_data.get("customer")
        if customer_id:
            # 7 days grace period logic
            execute_write(
                "UPDATE pharmacies SET status = 'Inactivo', trial_ends_at = datetime('now', '+7 days') WHERE stripe_customer_id = ?",
                (customer_id,)
            )
            
    # Mark as processed
    execute_write(
        "INSERT INTO event_log (id, tenant_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
        (event_id, event_data.get("client_reference_id", "system"), event_type, json.dumps(data))
    )
        
    return {"status": "success"}

@router.post("/consulting")
def request_consulting(service_type: str, description: str, urgency: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Phase 27.8: Consultoría como Servicio.
    Creates a ConsultingProject.
    """
    tenant_id = current_user.get("tenant_id", current_user.get("id"))
    # new_project = ConsultingProject(tenant_id=tenant_id, service_type=service_type, description=description, urgency=urgency)
    # db.add(new_project)
    # db.commit()
    return {"status": "success", "message": "Consultoría solicitada exitosamente. Nuestro equipo te contactará pronto."}
