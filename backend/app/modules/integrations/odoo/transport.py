from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import httpx
import uuid
from loguru import logger

class BaseOdooTransport(ABC):
    """
    Abstract Base Class for Odoo Transport.
    Allows seamlessly swapping between XML-RPC and JSON-RPC implementations.
    """
    def __init__(self, url: str, db: str, username: str, api_key: str):
        self.url = url.rstrip("/")
        self.db = db
        self.username = username
        self.api_key = api_key
        self.uid: Optional[int] = None

    @abstractmethod
    async def authenticate(self) -> int:
        """Authenticates with Odoo and returns the UID."""
        pass

    @abstractmethod
    async def execute_kw(self, model: str, method: str, args: List[Any], kwargs: Optional[Dict[str, Any]] = None) -> Any:
        """Executes a method on an Odoo model."""
        pass


class JsonRpcTransport(BaseOdooTransport):
    """
    Modern Async Transport layer using JSON-RPC.
    Better for performance and avoiding blocking the event loop.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = httpx.AsyncClient(timeout=30.0)

    async def _call_jsonrpc(self, endpoint: str, payload: Dict[str, Any]) -> Any:
        url = f"{self.url}/jsonrpc"
        body = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": payload,
            "id": str(uuid.uuid4())
        }
        response = await self.client.post(url, json=body)
        response.raise_for_status()
        data = response.json()
        
        if "error" in data:
            logger.error(f"Odoo JSON-RPC Error: {data['error']}")
            raise Exception(f"Odoo JSON-RPC Error: {data['error'].get('message', '')} - {data['error'].get('data', {}).get('message', '')}")
            
        return data.get("result")

    async def authenticate(self) -> int:
        payload = {
            "service": "common",
            "method": "authenticate",
            "args": [self.db, self.username, self.api_key, {}]
        }
        self.uid = await self._call_jsonrpc("/jsonrpc", payload)
        if not self.uid:
            raise Exception("Odoo Authentication Failed. Invalid credentials.")
        return self.uid

    async def execute_kw(self, model: str, method: str, args: List[Any], kwargs: Optional[Dict[str, Any]] = None) -> Any:
        if not self.uid:
            await self.authenticate()
            
        kwargs = kwargs or {}
        payload = {
            "service": "object",
            "method": "execute_kw",
            "args": [self.db, self.uid, self.api_key, model, method, args, kwargs]
        }
        return await self._call_jsonrpc("/jsonrpc", payload)

    async def close(self):
        await self.client.aclose()
