import time
import logging
from enum import Enum
from functools import wraps
from typing import Callable, Any

logger = logging.getLogger("farmaai.circuit_breaker")

class CircuitState(Enum):
    CLOSED = "CLOSED"     # Normal operation
    OPEN = "OPEN"         # Failing, short-circuiting calls
    HALF_OPEN = "HALF_OPEN" # Testing recovery

class CircuitBreaker:
    """
    Patrón Circuit Breaker para escalabilidad y Fault Tolerance.
    Evita que el sistema colapse por llamadas en cascada a servicios externos
    caídos (Ej. WhatsApp Cloud API, OpenAI, Pasarelas de Pago).
    """
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.state = CircuitState.CLOSED
        self.failures = 0
        self.last_failure_time = 0

    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._execute(func, *args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._execute_sync(func, *args, **kwargs)

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    def _check_state(self):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                logger.info("Circuit Breaker transitando a HALF_OPEN para probar recuperación.")
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit Breaker OPEN: Servicio temporalmente no disponible.")

    def _record_success(self):
        if self.state == CircuitState.HALF_OPEN:
            logger.info("Servicio recuperado. Circuit Breaker transitando a CLOSED.")
            self.state = CircuitState.CLOSED
            self.failures = 0

    def _record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            logger.error(f"Umbral de fallos alcanzado. Circuit Breaker transitando a OPEN.")
            self.state = CircuitState.OPEN

    async def _execute(self, func: Callable, *args, **kwargs) -> Any:
        self._check_state()
        try:
            result = await func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            raise e

    def _execute_sync(self, func: Callable, *args, **kwargs) -> Any:
        self._check_state()
        try:
            result = func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            raise e
