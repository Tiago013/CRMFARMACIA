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
def get_usage(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    tenant_id = getattr(current_user, "tenant_id", current_user.id)
    usage = UsageService.get_usage(db, tenant_id)
    return usage

@router.post("/checkout-session")
def create_checkout_session(plan_slug: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Creates a Stripe checkout session for a specific plan.
    Mocked for development.
    """
    tenant_id = getattr(current_user, "tenant_id", current_user.id)
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
    tenant_id = getattr(current_user, "tenant_id", current_user.id)
    # 1. Get subscription / stripe_customer_id
    # 2. session = stripe.billing_portal.Session.create(customer=customer_id)
    return {"portal_url": "https://billing.stripe.com/p/session/mock_portal"}

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook to receive events (e.g. payment_intent.succeeded).
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    # try:
    #     event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    # except Exception as e:
    #     raise HTTPException(status_code=400, detail=str(e))
    
    event = {"type": "checkout.session.completed", "data": {"object": {}}} # Mock event
    
    if event["type"] == "checkout.session.completed":
        pass # Handle successful checkout, activate plan
    elif event["type"] == "invoice.paid":
        pass # Extend period
    elif event["type"] == "invoice.payment_failed":
        pass # Mark past_due
    elif event["type"] == "customer.subscription.updated":
        pass # Upgrade/downgrade plan
    elif event["type"] == "customer.subscription.deleted":
        pass # Mark cancelled, 7 days grace period
        
    return {"status": "success"}

@router.post("/consulting")
def request_consulting(service_type: str, description: str, urgency: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Phase 27.8: Consultoría como Servicio.
    Creates a ConsultingProject.
    """
    tenant_id = getattr(current_user, "tenant_id", current_user.id)
    # new_project = ConsultingProject(tenant_id=tenant_id, service_type=service_type, description=description, urgency=urgency)
    # db.add(new_project)
    # db.commit()
    return {"status": "success", "message": "Consultoría solicitada exitosamente. Nuestro equipo te contactará pronto."}
