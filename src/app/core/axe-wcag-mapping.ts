import type * as axe from 'axe-core';
import type { Severidad } from './models';
import { CATALOGO_WCAG_2_2 } from './wcag-catalogo';

// Mapeo de reglas de axe-core a criterios WCAG calculado en tiempo de
// ejecución a partir de sus tags (ej. 'wcag111', 'wcag143'), en vez de una
// tabla mantenida a mano — ver specs/11-escaneo-axe.md "Decisiones tomadas
// y descartadas". Evita una lista de ~90 reglas desincronizada de la
// versión real de axe-core instalada.
export function codigosCriterioParaTags(tags: string[]): string[] {
  const tagsPresentes = new Set(tags);
  return CATALOGO_WCAG_2_2.filter((criterio) => tagsPresentes.has(tagEsperado(criterio.codigo))).map(
    (criterio) => criterio.codigo,
  );
}

function tagEsperado(codigo: string): string {
  return `wcag${codigo.replace(/\./g, '')}`;
}

// impact de axe-core → Severidad del checklist. null/desconocido se mapea a
// 'media' (no 'baja') para no infravalorar un hallazgo del que axe no da
// información de impacto.
export function severidadDesdeImpacto(impact: axe.ImpactValue | undefined): Severidad {
  switch (impact) {
    case 'critical':
      return 'critica';
    case 'serious':
      return 'alta';
    case 'moderate':
      return 'media';
    case 'minor':
      return 'baja';
    default:
      return 'media';
  }
}
