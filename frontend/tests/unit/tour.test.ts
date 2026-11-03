import { describe, expect, it } from 'vitest';
import { TOUR_STEPS, clampStep, menuPath } from '@/lib/tour/steps';
import { DEMO_ACCOUNTS } from '@/lib/roles';

describe('recorrido guiado', () => {
  it('sigue el orden del plan y termina en el dashboard', () => {
    expect(TOUR_STEPS.map((s) => menuPath(s.href))).toEqual(['/crm', '/sales', '/whatsapp', '/inventory', '/transactions', '/dashboard']);
  });

  it('cada paso dice qué hacer en la página', () => {
    for (const s of TOUR_STEPS) expect(s.tryIt.length).toBeGreaterThan(20);
  });

  it('quita la parte ?tab= para encontrar la entrada del menú', () => {
    expect(menuPath('/transactions?tab=cierre')).toBe('/transactions');
    expect(menuPath('/crm')).toBe('/crm');
  });

  it('no se sale de los pasos', () => {
    expect(clampStep(-1)).toBe(0);
    expect(clampStep(99)).toBe(TOUR_STEPS.length - 1);
  });

  it('la página de inicio enlaza cada cuenta demo por su rol', () => {
    expect(DEMO_ACCOUNTS.map((a) => a.role)).toEqual(['cajero', 'regente', 'admin']);
  });
});
