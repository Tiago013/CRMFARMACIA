import { afterEach, describe, expect, it, vi } from 'vitest';
import { deliver, fillTemplate, needsSale, whatsappMode } from '@/lib/whatsapp/messages';

const sale = {
  grand_total: 213488.38,
  created_at: '2026-11-03T02:30:00Z', // 2 nov., 9:30 p. m. en Bogotá
  items: [
    { quantity: 2, total: 99276.94, name: 'Ranitidina 150mg' },
    { quantity: 1, total: 81405.52, name: 'Omeprazol 20mg' },
  ],
};

describe('fillTemplate', () => {
  it('rellena nombre, total, fecha local y detalle', () => {
    const msg = fillTemplate('Hola {{1}}, compra del {{3}}:\n{{4}}\nTotal {{2}}', 'Laura', sale);
    expect(msg).toBe('Hola Laura, compra del 2/11/2026:\n🔹 2x Ranitidina 150mg ($99.277)\n🔹 1x Omeprazol 20mg ($81.406)\nTotal $213.488');
  });

  it('reemplaza todas las apariciones de una variable', () => {
    expect(fillTemplate('{{1}} y {{1}}', 'Ana')).toBe('Ana y Ana');
  });

  it('sin venta deja marcadores legibles', () => {
    expect(fillTemplate('Hola {{1}}, total {{2}}', 'Ana')).toBe('Hola Ana, total (monto)');
  });

  it('deja intactas las variables que no conoce', () => {
    expect(fillTemplate('{{1}} {{9}}', 'Ana')).toBe('Ana {{9}}');
  });
});

describe('needsSale', () => {
  it('detecta variables de compra', () => {
    expect(needsSale('Total {{2}}')).toBe(true);
    expect(needsSale('Hola {{1}}')).toBe(false);
  });
});

describe('modo y envío', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('por defecto es demo; solo "local" activa el envío real', () => {
    expect(whatsappMode(undefined)).toBe('demo');
    expect(whatsappMode('LOCAL')).toBe('demo');
    expect(whatsappMode('local')).toBe('local');
  });

  it('en modo demo no hace ninguna llamada de red', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await deliver('3000000000', 'hola', 'demo')).toEqual({ status: 'simulado' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('en modo local envía al servicio y reporta el resultado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    expect(await deliver('3000000000', 'hola', 'local')).toEqual({ status: 'enviado' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'Número inválido' }) }));
    expect(await deliver('3000000000', 'hola', 'local')).toEqual({ status: 'error', error: 'Número inválido' });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    expect((await deliver('3000000000', 'hola', 'local')).status).toBe('error');
  });
});
