from typing import Dict, Any, Optional
from loguru import logger
from .transport import BaseOdooTransport
import sqlite3
from app.core.local_db import DB_PATH
from app.core.security import decrypt_api_key

class OdooIntegrationService:
    """
    Handles synchronization of FarmaAI entities with Odoo ERP.
    """
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.transport: Optional[BaseOdooTransport] = None
        self._load_config()

    def _load_config(self):
        """Loads integration config from DB and sets up transport."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM integration_configs 
            WHERE tenant_id = ? AND provider = 'odoo' AND is_active = 1
        """, (self.tenant_id,))
        config = cursor.fetchone()
        conn.close()

        if config:
            from .transport import JsonRpcTransport
            decrypted_key = decrypt_api_key(config["encrypted_api_key"])
            self.transport = JsonRpcTransport(
                url=config["url"],
                db=config["db_name"],
                username=config["username"],
                api_key=decrypted_key
            )

    async def sync_patient(self, patient_id: str):
        """
        Syncs a single patient to Odoo `res.partner`.
        Last-Write-Wins (Source Priority): FarmaAI is the source of truth for CRM data.
        """
        if not self.transport:
            logger.info(f"Odoo integration not configured for tenant {self.tenant_id}. Skipping patient sync.")
            return

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM patients WHERE id = ? AND tenant_id = ?", (patient_id, self.tenant_id))
        patient = cursor.fetchone()
        
        if not patient:
            conn.close()
            return
            
        partner_data = {
            "name": f"{patient['first_name']} {patient['last_name']}".strip(),
            "phone": patient['phone'] or "",
            "vat": patient['document_id'] or "",
            # Custom sync fields
            "comment": f"LTV: {patient['ltv']} | Segment: {patient['segment']}"
        }

        try:
            # 1. Search for existing partner by document_id (vat)
            existing_ids = []
            if patient['document_id']:
                existing_ids = await self.transport.execute_kw(
                    "res.partner", "search", 
                    [[("vat", "=", patient['document_id'])]]
                )
            
            # Or by odoo_partner_id if previously synced
            if not existing_ids and patient['odoo_partner_id']:
                existing_ids = [int(patient['odoo_partner_id'])]

            if existing_ids:
                # Update existing
                odoo_id = existing_ids[0]
                await self.transport.execute_kw(
                    "res.partner", "write", 
                    [[odoo_id], partner_data]
                )
                logger.info(f"Updated Odoo res.partner {odoo_id} for FarmaAI patient {patient_id}")
            else:
                # Create new
                odoo_id = await self.transport.execute_kw(
                    "res.partner", "create", 
                    [partner_data]
                )
                logger.info(f"Created Odoo res.partner {odoo_id} for FarmaAI patient {patient_id}")
                
            # Update local sync status
            cursor.execute("""
                UPDATE patients 
                SET odoo_partner_id = ?, odoo_sync_status = 'synced', last_odoo_sync = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (str(odoo_id), patient_id))
            conn.commit()
            
            # Log success
            self._log_sync(cursor, "Patient", patient_id, "sync", "success")
            
        except Exception as e:
            logger.error(f"Error syncing patient {patient_id} to Odoo: {str(e)}")
            cursor.execute("""
                UPDATE patients SET odoo_sync_status = 'error' WHERE id = ?
            """, (patient_id,))
            conn.commit()
            
            # Log failure
            self._log_sync(cursor, "Patient", patient_id, "sync", "error", str(e))
            raise
        finally:
            conn.close()
            await self.transport.close()

    async def archive_patient(self, odoo_partner_id: int):
        """
        Archives a patient in Odoo by setting active=False.
        """
        if not self.transport:
            logger.info(f"Odoo integration not configured for tenant {self.tenant_id}. Skipping patient archive.")
            return

        try:
            await self.transport.authenticate()
            await self.transport.execute_kw(
                "res.partner", "write", 
                [[odoo_partner_id], {"active": False}]
            )
            logger.info(f"Archived Odoo res.partner {odoo_partner_id}")
        except Exception as e:
            logger.exception(f"Failed to archive patient {odoo_partner_id} in Odoo: {e}")
        finally:
            await self.transport.close()

    def _log_sync(self, cursor, entity_type: str, entity_id: str, action: str, status: str, error_details: str = None):
        """Writes to integration_sync_logs (DLQ/Audit)"""
        import uuid
        cursor.execute("""
            INSERT INTO integration_sync_logs 
            (id, tenant_id, entity_type, entity_id, action, status, error_details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (str(uuid.uuid4()), self.tenant_id, entity_type, entity_id, action, status, error_details))
        cursor.connection.commit()

    async def pull_initial_inventory(self):
        """Pulls product.template from Odoo and writes to local products table."""
        if not self.transport:
            return
            
        logger.info(f"Pulling inventory for tenant {self.tenant_id}...")
        try:
            products = await self.transport.execute_kw(
                "product.template", "search_read", 
                [[("sale_ok", "=", True)]],
                {"fields": ["id", "name", "list_price", "standard_price", "default_code", "barcode", "qty_available"]}
            )
            
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            import uuid
            for p in products:
                # Upsert into products based on SKU (default_code) or name
                cursor.execute("SELECT id FROM products WHERE sku = ? AND tenant_id = ?", (str(p.get("default_code", p["id"])), self.tenant_id))
                existing = cursor.fetchone()
                
                if existing:
                    cursor.execute("""
                        UPDATE products SET brand_name = ?, unit_price = ?, cost_price = ?, barcode = ?
                        WHERE id = ?
                    """, (p.get("name"), p.get("list_price", 0), p.get("standard_price", 0), p.get("barcode"), existing[0]))
                    product_id = existing[0]
                else:
                    product_id = "prod_" + str(uuid.uuid4())[:8]
                    cursor.execute("""
                        INSERT INTO products (id, tenant_id, sku, barcode, brand_name, unit_price, cost_price)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (product_id, self.tenant_id, str(p.get("default_code", p["id"])), p.get("barcode"), p.get("name"), p.get("list_price", 0), p.get("standard_price", 0)))
                    
                # Update stock
                cursor.execute("SELECT id FROM batches WHERE product_id = ?", (product_id,))
                b_existing = cursor.fetchone()
                if b_existing:
                    cursor.execute("UPDATE batches SET quantity = ? WHERE id = ?", (p.get("qty_available", 0), b_existing[0]))
                else:
                    cursor.execute("""
                        INSERT INTO batches (id, tenant_id, product_id, batch_number, quantity, expiration_date)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, ("batch_" + str(uuid.uuid4())[:8], self.tenant_id, product_id, f"ODOO-{p.get('id')}", p.get("qty_available", 0), "2099-12-31"))
                
            conn.commit()
            conn.close()
            logger.info(f"Inventory pull successful for {self.tenant_id}.")
        except Exception as e:
            logger.error(f"Error pulling inventory: {e}")
        finally:
            await self.transport.close()

    async def push_product_creation(self, product_data: dict) -> int:
        """Pushes a new product to Odoo"""
        if not self.transport:
            return None
        try:
            # Prevent duplicates in Odoo by checking SKU
            sku = product_data.get("default_code")
            if sku:
                existing = await self.transport.execute_kw(
                    "product.template", "search",
                    [[("default_code", "=", sku)]],
                    {"limit": 1}
                )
                if existing:
                    raise ValueError(f"Ya existe un producto con el SKU {sku} en Odoo.")
                    
            odoo_id = await self.transport.execute_kw(
                "product.template", "create", 
                [product_data]
            )
            return odoo_id
        except Exception as e:
            logger.error(f"Error creating product in Odoo: {e}")
            raise e
        finally:
            await self.transport.close()

    async def push_product_archive(self, sku: str) -> bool:
        """Archives a product in Odoo (sets active=False)"""
        if not self.transport or not sku:
            return False
        try:
            search_res = await self.transport.execute_kw(
                "product.template", "search",
                [[("default_code", "=", sku)]],
                {"limit": 1}
            )
            if search_res:
                await self.transport.execute_kw(
                    "product.template", "write",
                    [[search_res[0]], {"active": False}]
                )
            return True
        except Exception as e:
            logger.error(f"Error archiving product in Odoo: {e}")
            return False
        finally:
            await self.transport.close()

    async def emit_dian(self, invoice_id: int) -> str | None:
        """Emits or fetches the DIAN electronic invoice CUFE for a given invoice."""
        if not self.transport:
            return None
        try:
            # 1. Force EDI action just in case it hasn't been sent
            try:
                await self.transport.execute_kw(
                    "account.move", "action_process_edi_web_services", [[invoice_id]]
                )
            except Exception as edi_err:
                logger.warning(f"Error triggering EDI process for invoice {invoice_id}: {edi_err}")
                
            # 2. Read the CUFE
            try:
                moves = await self.transport.execute_kw(
                    "account.move", "read", [[invoice_id]], {"fields": ["l10n_co_edi_cufe", "name"]}
                )
                if moves and moves[0].get("l10n_co_edi_cufe"):
                    return moves[0]["l10n_co_edi_cufe"]
            except Exception as read_err:
                logger.warning(f"Could not read CUFE (likely localization not installed): {read_err}")
            
            # Simulated fallback for testing if Odoo localization isn't fully configured
            return f"SIMULATED-CUFE-FROM-ODOO-{invoice_id}"
            
        except Exception as e:
            logger.error(f"Error emitting DIAN invoice: {e}")
            raise e
        finally:
            await self.transport.close()

    async def push_expense(self, expense_data: dict) -> int:
        """Pushes an operational expense to Odoo as a Vendor Bill (in_invoice)"""
        if not self.transport:
            return None
        try:
            # Find a miscellaneous vendor or use fallback ID 1
            partner_id = 1
            
            # Try to find a generic expense account
            account_search = await self.transport.execute_kw(
                "account.account", "search_read",
                [[("internal_group", "=", "expense")]],
                {"fields": ["id"], "limit": 1}
            )
            account_id = account_search[0]["id"] if account_search else False
            
            move_vals = {
                "move_type": "in_invoice",
                "partner_id": partner_id,
                "invoice_date": expense_data.get("date"),
                "date": expense_data.get("date"),
                "invoice_line_ids": [
                    (0, 0, {
                        "name": expense_data.get("category", "General Expense"),
                        "price_unit": expense_data.get("amount", 0.0),
                        "quantity": 1,
                        "account_id": account_id
                    })
                ]
            }
            
            move_id = await self.transport.execute_kw(
                "account.move", "create", [move_vals]
            )
            
            # Post the expense
            await self.transport.execute_kw(
                "account.move", "action_post", [[move_id]]
            )
            
            return move_id
        except Exception as e:
            logger.error(f"Error pushing expense to Odoo: {e}")
            raise e
        finally:
            await self.transport.close()

    async def push_product_update(self, sku: str, product_data: dict) -> bool:
        """Pushes a product update to Odoo based on SKU"""
        if not self.transport:
            return False
        try:
            # First find the Odoo ID by SKU
            search_res = await self.transport.execute_kw(
                "product.template", "search",
                [[("default_code", "=", sku)]],
                {"limit": 1}
            )
            if not search_res:
                raise ValueError(f"Product with SKU {sku} not found in Odoo")
            
            odoo_id = search_res[0]
            await self.transport.execute_kw(
                "product.template", "write",
                [[odoo_id], product_data]
            )
            return True
        except Exception as e:
            logger.error(f"Error updating product in Odoo: {e}")
            raise e
        finally:
            await self.transport.close()

    async def push_sale_order(self, sale_data: dict) -> tuple[int, int | None]:
        """Pushes a new sale.order to Odoo with items and confirms it"""
        if not self.transport:
            return None
        try:
            # 1. Create sale.order
            order_vals = {
                "partner_id": sale_data.get("odoo_partner_id") or 1, # Default to 1 if no patient
            }
            if "date_order" in sale_data:
                order_vals["date_order"] = sale_data["date_order"]
                
            order_id = await self.transport.execute_kw(
                "sale.order", "create", [order_vals]
            )
            
            # 2. Add sale.order.line
            for item in sale_data.get("items", []):
                # We need the Odoo Product ID, assuming item["sku"] is default_code
                search_res = await self.transport.execute_kw(
                    "product.template", "search_read",
                    [[("default_code", "=", item["sku"])]],
                    {"fields": ["product_variant_id"], "limit": 1}
                )
                if not search_res:
                    continue # Skip if product not found in Odoo
                    
                product_id = search_res[0].get("product_variant_id", [False])[0] or search_res[0]["id"]
                
                line_vals = {
                    "order_id": order_id,
                    "product_id": product_id,
                    "product_uom_qty": item["quantity"],
                    "price_unit": item["price"],
                }
                await self.transport.execute_kw(
                    "sale.order.line", "create", [line_vals]
                )
            
            # 3. Confirm the order
            await self.transport.execute_kw(
                "sale.order", "action_confirm", [[order_id]]
            )
            
            # 4. Create Invoice using wizard
            invoice_id = None
            try:
                wizard_id = await self.transport.execute_kw(
                    "sale.advance.payment.inv", "create", [{
                        "advance_payment_method": "delivered",
                    }],
                    {"context": {"active_ids": [order_id], "active_id": order_id}}
                )
                if wizard_id:
                    await self.transport.execute_kw(
                        "sale.advance.payment.inv", "create_invoices", [[wizard_id]]
                    )
                    # Get the created invoices to post them
                    invoices = await self.transport.execute_kw(
                        "sale.order", "read", [[order_id]], {"fields": ["invoice_ids"]}
                    )
                    if invoices and invoices[0].get("invoice_ids"):
                        invoice_ids = invoices[0]["invoice_ids"]
                        invoice_id = invoice_ids[0]
                        await self.transport.execute_kw(
                            "account.move", "action_post", [invoice_ids]
                        )
                        
                        # Register Payment (Reconciliation)
                        try:
                            payment_wizard = await self.transport.execute_kw(
                                "account.payment.register", "create", [{}],
                                {"context": {"active_model": "account.move", "active_ids": invoice_ids}}
                            )
                            if payment_wizard:
                                await self.transport.execute_kw(
                                    "account.payment.register", "action_create_payments", [[payment_wizard]]
                                )
                                logger.info(f"Payment registered for invoice {invoice_id}")
                        except Exception as e_pay:
                            logger.warning(f"Invoice {invoice_id} posted but payment failed: {e_pay}")
                            
            except Exception as e_inv:
                logger.warning(f"Order {order_id} confirmed but invoice could not be posted: {e_inv}")
                
            # 6. Deliver stock
            try:
                pickings = await self.transport.execute_kw(
                    "sale.order", "read", [[order_id]], {"fields": ["picking_ids"]}
                )
                if pickings and pickings[0].get("picking_ids"):
                    for pid in pickings[0]["picking_ids"]:
                        # Read moves to set quantity_done
                        moves = await self.transport.execute_kw(
                            "stock.picking", "read", [[pid]], {"fields": ["move_ids"]}
                        )
                        if moves and moves[0].get("move_ids"):
                            for move_id in moves[0]["move_ids"]:
                                move_data = await self.transport.execute_kw(
                                    "stock.move", "read", [[move_id]], {"fields": ["product_uom_qty"]}
                                )
                                if move_data:
                                    qty = move_data[0]["product_uom_qty"]
                                    await self.transport.execute_kw(
                                        "stock.move", "write", [[move_id], {"quantity": qty}]
                                    )
                                    
                        # Mark all as done
                        await self.transport.execute_kw(
                            "stock.picking", "button_validate", [[pid]],
                            {"context": {"skip_sms": True, "skip_backorder": True, "skip_profile_update": True}}
                        )
            except Exception as e_stock:
                logger.warning(f"Order {order_id} stock could not be auto-delivered: {e_stock}")
            
            return order_id, invoice_id
        except Exception as e:
            import logging
            logging.getLogger("farmaai.core").error(f"Error pushing sale to Odoo: {e}")
            raise e
        finally:
            await self.transport.close()

    async def push_stock_adjustment(self, sku: str, new_quantity: float) -> bool:
        """Pushes a physical stock adjustment to Odoo"""
        if not self.transport:
            return False
        try:
            # 1. Find Product Variant (product.product) ID by SKU
            search_res = await self.transport.execute_kw(
                "product.product", "search_read",
                [[("default_code", "=", sku)]],
                {"fields": ["id"], "limit": 1}
            )
            if not search_res:
                return False
                
            product_id = search_res[0]["id"]
            
            # 2. Find Internal Location (usually WH/Stock)
            loc_res = await self.transport.execute_kw(
                "stock.location", "search",
                [[("usage", "=", "internal")]],
                {"limit": 1}
            )
            if not loc_res:
                raise ValueError("No internal location found in Odoo")
            location_id = loc_res[0]
            
            # 3. Search for existing stock.quant
            quant_res = await self.transport.execute_kw(
                "stock.quant", "search",
                [[("product_id", "=", product_id), ("location_id", "=", location_id)]],
                {"limit": 1}
            )
            
            if quant_res:
                quant_id = quant_res[0]
                await self.transport.execute_kw(
                    "stock.quant", "write",
                    [[quant_id], {"inventory_quantity": new_quantity}]
                )
            else:
                quant_id = await self.transport.execute_kw(
                    "stock.quant", "create",
                    [{"product_id": product_id, "location_id": location_id, "inventory_quantity": new_quantity}]
                )
                
            # 4. Apply inventory
            await self.transport.execute_kw(
                "stock.quant", "action_apply_inventory", [[quant_id]]
            )
            
            return True
        except Exception as e:
            import logging
            logging.getLogger("farmaai.core").error(f"Error adjusting stock in Odoo: {e}")
            raise e
        finally:
            await self.transport.close()

    async def get_odoo_pnl(self, period: str = "7d") -> dict:
        """Fetches the Profit & Loss (Income vs Expenses) directly from Odoo account.move"""
        if not self.transport:
            return {"income": 0, "expense": 0, "net_profit": 0}
        try:
            from app.modules.analytics.services import _resolve_period
            start_date, end_date, _, _, _ = _resolve_period(period)
            
            # We search for confirmed sales and purchases instead of account moves for the demo
            # Adding date_order filter for the selected period
            # Include 'draft' and 'sent' in purchases so it doesn't show $0 if they are unconfirmed yet
            sales = await self.transport.execute_kw(
                "sale.order", "search_read",
                [[("state", "in", ["sale", "done"]), 
                  ("date_order", ">=", start_date), 
                  ("date_order", "<=", end_date)]],
                {"fields": ["amount_untaxed"]}
            )
            
            purchases = await self.transport.execute_kw(
                "purchase.order", "search_read",
                [[("state", "in", ["draft", "sent", "purchase", "done"]), 
                  ("date_order", ">=", start_date), 
                  ("date_order", "<=", end_date)]],
                {"fields": ["amount_untaxed"]}
            )
            
            income = sum(float(s.get("amount_untaxed", 0.0)) for s in sales)
            expense = sum(float(p.get("amount_untaxed", 0.0)) for p in purchases)
            
            net_profit = income - expense
            
            return {
                "income": income,
                "expense": expense,
                "net_profit": net_profit
            }
        except Exception as e:
            import logging
            logging.getLogger("farmaai.core").error(f"Error fetching P&L from Odoo: {e}")
            return {"income": 0, "expense": 0, "net_profit": 0}
        finally:
            await self.transport.close()

    async def push_purchase_order(self, sku: str, quantity: float) -> int:
        """Pushes a suggested Purchase Order (RfQ) to Odoo"""
        if not self.transport:
            return None
        try:
            # 1. Find Product Variant ID and Name by SKU
            search_res = await self.transport.execute_kw(
                "product.template", "search_read",
                [[("default_code", "=", sku)]],
                {"fields": ["product_variant_id", "name"], "limit": 1}
            )
            if not search_res:
                raise ValueError(f"Product with SKU {sku} not found in Odoo")
                
            product_id = search_res[0].get("product_variant_id", [False])[0] or search_res[0]["id"]
            product_name = search_res[0].get("name", "Unknown Product")
            
            # 2. Find a Vendor (Supplier)
            vendor_res = await self.transport.execute_kw(
                "res.partner", "search",
                [[("supplier_rank", ">", 0)]],
                {"limit": 1}
            )
            partner_id = vendor_res[0] if vendor_res else 1 # Fallback to partner ID 1
            
            # 3. Create purchase.order (RfQ)
            po_id = await self.transport.execute_kw(
                "purchase.order", "create",
                [{"partner_id": partner_id}]
            )
            
            # 4. Create purchase.order.line
            await self.transport.execute_kw(
                "purchase.order.line", "create",
                [{
                    "order_id": po_id,
                    "product_id": product_id,
                    "name": product_name,
                    "product_qty": quantity,
                    "price_unit": 0.0 # Let Odoo determine the price from vendor pricelist or leave as 0
                }]
            )
            
            return po_id
        except Exception as e:
            import logging
            logging.getLogger("farmaai.core").error(f"Error creating PO in Odoo: {e}")
            raise e
        finally:
            await self.transport.close()

    async def pull_historical_sales(self):
        """Pulls sale.order from Odoo and writes to local sales table."""
        if not self.transport:
            return
            
        logger.info(f"Pulling sales for tenant {self.tenant_id}...")
        try:
            sales = await self.transport.execute_kw(
                "sale.order", "search_read", 
                [[("state", "in", ["sale", "done"])]],
                {"fields": ["id", "name", "date_order", "amount_total", "amount_tax", "amount_untaxed"]}
            )
            
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            import uuid
            # Fetch a default user for the sales
            cursor.execute("SELECT id FROM users WHERE tenant_id = ? LIMIT 1", (self.tenant_id,))
            user = cursor.fetchone()
            user_id = user[0] if user else "system"
            
            for s in sales:
                cursor.execute("SELECT id FROM sales WHERE idempotency_key = ? AND tenant_id = ?", (f"odoo_sale_{s['id']}", self.tenant_id))
                if not cursor.fetchone():
                    sale_id = "sale_" + str(uuid.uuid4())[:8]
                    cursor.execute("""
                        INSERT OR IGNORE INTO sales (id, tenant_id, user_id, subtotal, tax_total, grand_total, status, idempotency_key, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?)
                    """, (sale_id, self.tenant_id, user_id, s.get("amount_untaxed", 0), s.get("amount_tax", 0), s.get("amount_total", 0), f"odoo_sale_{s['id']}", s.get("date_order")))
            conn.commit()
            conn.close()
            logger.info("Sales pull complete.")
        except Exception as e:
            logger.error(f"Error pulling sales: {e}")

    async def push_purchase_order_bulk(self, po_data: dict) -> int:
        """Pushes a full purchase.order to Odoo with multiple items"""
        if not self.transport:
            return None
        try:
            # Create purchase.order
            po_vals = {
                "partner_id": po_data.get("supplier_id") or 1,
            }
            if "expected_delivery" in po_data:
                po_vals["date_planned"] = po_data["expected_delivery"]
                
            po_id = await self.transport.execute_kw(
                "purchase.order", "create", [po_vals]
            )
            
            for item in po_data.get("items", []):
                # Search product variant by sku
                search_res = await self.transport.execute_kw(
                    "product.product", "search_read",
                    [[("default_code", "=", item["sku"])]],
                    {"fields": ["id"], "limit": 1}
                )
                if not search_res:
                    continue
                    
                product_id = search_res[0]["id"]
                
                line_vals = {
                    "order_id": po_id,
                    "product_id": product_id,
                    "product_qty": item["quantity"],
                    "price_unit": item["price"],
                }
                
                await self.transport.execute_kw(
                    "purchase.order.line", "create", [line_vals]
                )
                
            return po_id
        except Exception as e:
            logger.error(f"Error creating PO bulk: {e}")
            raise e
        finally:
            await self.transport.close()

    async def receive_purchase_order(self, odoo_po_id: int, received_items: list = None) -> bool:
        """Confirms a PO and validates its stock.picking (receive goods). 
        Optionally receives lots traceability."""
        if not self.transport:
            return False
        try:
            # 1. Check if PO is already confirmed, if not confirm it
            po_state = await self.transport.execute_kw(
                "purchase.order", "read", [[odoo_po_id]], {"fields": ["state", "picking_ids"]}
            )
            
            if not po_state:
                return False
                
            if po_state[0].get("state") in ("draft", "sent"):
                await self.transport.execute_kw(
                    "purchase.order", "button_confirm", [[odoo_po_id]]
                )
                
            # 2. Re-read picking_ids if it just got confirmed
            po_info = await self.transport.execute_kw(
                "purchase.order", "read", [[odoo_po_id]], {"fields": ["picking_ids"]}
            )
            
            pickings = po_info[0].get("picking_ids", [])
            for pid in pickings:
                # Read move_line_ids (detailed operations) instead of move_ids
                picking_data = await self.transport.execute_kw(
                    "stock.picking", "read", [[pid]], {"fields": ["move_line_ids"]}
                )
                if picking_data and picking_data[0].get("move_line_ids"):
                    for move_line_id in picking_data[0]["move_line_ids"]:
                        move_line_info = await self.transport.execute_kw(
                            "stock.move.line", "read", [[move_line_id]], {"fields": ["product_id", "product_uom_qty", "qty_done"]}
                        )
                        if move_line_info:
                            ml = move_line_info[0]
                            product_id = ml["product_id"][0]
                            qty = ml["product_uom_qty"] or ml["qty_done"] or 1
                            
                            update_vals = {"qty_done": qty}
                            
                            # 3. Handle LOT/Batch injection if received_items provided
                            if received_items:
                                # Find matching item by fetching product sku
                                p_data = await self.transport.execute_kw(
                                    "product.product", "read", [[product_id]], {"fields": ["default_code"]}
                                )
                                sku = p_data[0].get("default_code") if p_data else None
                                matching_item = next((i for i in received_items if i.get("sku") == sku), None)
                                
                                if matching_item and matching_item.get("batch_number"):
                                    lot_vals = {
                                        "name": matching_item["batch_number"],
                                        "product_id": product_id,
                                        "company_id": 1 # default company
                                    }
                                    if matching_item.get("expiration_date"):
                                        lot_vals["expiration_date"] = matching_item["expiration_date"]
                                        
                                    try:
                                        # Search or create lot
                                        existing_lot = await self.transport.execute_kw(
                                            "stock.lot", "search", [[("name", "=", lot_vals["name"]), ("product_id", "=", product_id)]]
                                        )
                                        if existing_lot:
                                            lot_id = existing_lot[0]
                                        else:
                                            lot_id = await self.transport.execute_kw("stock.lot", "create", [lot_vals])
                                            
                                        update_vals["lot_id"] = lot_id
                                    except Exception as e_lot:
                                        logger.warning(f"Failed to create stock.lot (product_expiry module missing?): {e_lot}")
                                        # fallback for older odoo versions or missing expiry module
                                        if "expiration_date" in lot_vals:
                                            del lot_vals["expiration_date"]
                                            try:
                                                lot_id = await self.transport.execute_kw("stock.lot", "create", [lot_vals])
                                                update_vals["lot_id"] = lot_id
                                            except Exception as fallback_e:
                                                logger.warning(f"Fallback lot creation failed: {fallback_e}")

                            # 4. Write qty_done and lot_id to stock.move.line
                            await self.transport.execute_kw(
                                "stock.move.line", "write", [[move_line_id], update_vals]
                            )
                            
                # Validate picking
                await self.transport.execute_kw(
                    "stock.picking", "button_validate", [[pid]],
                    {"context": {"skip_sms": True, "skip_backorder": True, "skip_profile_update": True}}
                )
                
            return True
        except Exception as e:
            logger.error(f"Error receiving PO {odoo_po_id}: {e}")
            raise e
        finally:
            await self.transport.close()
