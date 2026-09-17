// Etiquetas WCAG 2.2 A/AA de axe-core — excluye reglas "best-practice" que no
// mapean a ningún criterio del catálogo (specs/11-escaneo-axe.md). Sin
// imports: tanto el cliente (iframe, specs/11-escaneo-axe.md) como la función
// serverless (Chromium, specs/12-escaneo-url.md) ejecutan axe-core con este
// mismo conjunto de reglas.
export const TAGS_WCAG_2_2_A_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
