import { Injectable, inject } from '@angular/core';
import * as axe from 'axe-core';
import { TAGS_WCAG_2_2_A_AA } from './axe-tags';
import { textoViolacionEs } from './axe-traducciones';
import { codigosCriterioParaTags, severidadDesdeImpacto } from './axe-wcag-mapping';
import { HallazgosService } from './hallazgos';
import type { Severidad } from './models';
import { ResultadosService } from './resultados';

// axe-core debe ejecutarse dentro del mismo realm de JS que el documento que
// analiza: axe.run() valida internamente `contextList instanceof window.Node`
// contra SU PROPIO `window`, así que un Document de otro iframe (aunque sea
// de mismo origen) nunca pasa esa comprobación desde fuera. Por eso axe-core
// se inyecta y corre dentro del iframe (axe.source, pensado exactamente para
// esto: "Source string to use as an injected script"), y el resultado vuelve
// al padre por postMessage — ver specs/11-escaneo-axe.md "Decisiones
// tomadas y descartadas".
const TIMEOUT_ESCANEO_MS = 15000;

const RANGO_SEVERIDAD: Record<Severidad, number> = { baja: 0, media: 1, alta: 2, critica: 3 };

export interface ResumenEscaneo {
  criteriosMarcados: number;
}

// Violación de axe-core mínima que necesita el agrupador — evita acoplar
// los tests a la forma completa de axe.Result (description/helpUrl/nodes).
// id identifica la regla para traducir su help al español — ver
// specs/19-traduccion-axe.md. capturaPng (data URL) solo lo rellena el modo
// "URL en vivo" — ver specs/13-captura-evidencia-escaneo.md.
export type ViolacionAxe = Pick<axe.Result, 'id' | 'tags' | 'impact' | 'help'> & { capturaPng?: string };

type MensajeEscaneoAxe =
  | { tipo: 'resultado-escaneo-axe'; resultados: axe.AxeResults }
  | { tipo: 'error-escaneo-axe'; mensaje: string };

export interface CapturaViolacion {
  dataUrl: string;
  descripcion: string;
}

// Varias violaciones de una misma ejecución que mapean al mismo criterio se
// agregan en un único Hallazgo automático por criterio (no uno por
// violación): la severidad es la más alta de las agrupadas y las notas se
// concatenan — ver specs/11-escaneo-axe.md "Riesgos identificados". Las
// capturas (solo presentes en modo "URL en vivo", ver specs/13-captura-
// evidencia-escaneo.md) se agregan igual, una entrada por violación con
// capturaPng. Notas y descripciones de captura se guardan en español
// (textoViolacionEs(), con fallback al help en inglés) — ver
// specs/19-traduccion-axe.md.
export function agruparViolacionesPorCriterio(
  violaciones: ViolacionAxe[],
): Map<string, { severidad: Severidad; notas: string; capturas: CapturaViolacion[] }> {
  const agrupado = new Map<
    string,
    { severidad: Severidad; notas: string[]; capturas: CapturaViolacion[] }
  >();

  for (const violacion of violaciones) {
    const severidad = severidadDesdeImpacto(violacion.impact);
    const texto = textoViolacionEs(violacion);
    for (const codigo of codigosCriterioParaTags(violacion.tags)) {
      const actual = agrupado.get(codigo);
      if (!actual) {
        agrupado.set(codigo, { severidad, notas: [texto], capturas: [] });
        continue;
      }
      actual.notas.push(texto);
      if (RANGO_SEVERIDAD[severidad] > RANGO_SEVERIDAD[actual.severidad]) {
        actual.severidad = severidad;
      }
    }
  }

  // Segunda pasada: las capturas se añaden después de crear todas las
  // entradas, para que una violación con capturaPng pero sin ningún tag
  // reconocido (ignorada arriba) no cree una entrada vacía.
  for (const violacion of violaciones) {
    if (!violacion.capturaPng) continue;
    for (const codigo of codigosCriterioParaTags(violacion.tags)) {
      agrupado.get(codigo)?.capturas.push({
        dataUrl: violacion.capturaPng,
        descripcion: textoViolacionEs(violacion),
      });
    }
  }

  return new Map(
    [...agrupado].map(([codigo, { severidad, notas, capturas }]) => [
      codigo,
      { severidad, notas: notas.join('\n'), capturas },
    ]),
  );
}

// Ejecuta axe-core sobre HTML pegado (modo cliente) y pre-rellena el
// checklist de la página — ver specs/11-escaneo-axe.md. El modo "URL en
// vivo" (función serverless con Playwright) reutiliza aplicarViolaciones()
// con las violaciones que devuelve la función — ver specs/12-escaneo-url.md.
@Injectable({ providedIn: 'root' })
export class EscaneoAxeService {
  private readonly resultadosService = inject(ResultadosService);
  private readonly hallazgosService = inject(HallazgosService);

  async ejecutarSobreHtml(paginaId: number, html: string): Promise<ResumenEscaneo> {
    const resultado = await this.ejecutarAxeEnIframeAislado(html);
    return this.aplicarViolaciones(paginaId, resultado.violations);
  }

  // Público: es el punto de entrada común a los dos modos de escaneo (HTML
  // pegado y URL en vivo) — ver specs/12-escaneo-url.md.
  async aplicarViolaciones(paginaId: number, violaciones: ViolacionAxe[]): Promise<ResumenEscaneo> {
    const porCriterio = agruparViolacionesPorCriterio(violaciones);

    let criteriosMarcados = 0;
    for (const [codigo, { severidad, notas, capturas }] of porCriterio) {
      const { id: resultadoId, aplicado } = await this.resultadosService.guardarAutomatico(paginaId, codigo, {
        estado: 'falla',
      });
      if (!aplicado) continue;

      const capturasBlob = await Promise.all(
        capturas.map(async (captura) => ({
          archivo: await dataUrlABlob(captura.dataUrl),
          descripcion: captura.descripcion,
        })),
      );
      await this.hallazgosService.guardarAutomatico(resultadoId, { severidad, notas, capturas: capturasBlob });
      criteriosMarcados++;
    }

    return { criteriosMarcados };
  }

  // Renderiza el HTML pegado en un iframe oculto, fuera de la pantalla
  // (con layout/estilos reales, a diferencia de display:none, que haría
  // fallar comprobaciones que dependen de estilos calculados como el
  // contraste). sandbox="allow-scripts" SIN "allow-same-origin": el iframe
  // recibe un origen único y opaco — no puede acceder a cookies,
  // localStorage, IndexedDB ni al DOM de esta app aunque su contenido tenga
  // scripts activos (necesarios para que axe-core corra dentro de él). El
  // único canal con el padre es postMessage.
  private ejecutarAxeEnIframeAislado(html: string): Promise<axe.AxeResults> {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.setAttribute('inert', '');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '1024px';
      iframe.style.height = '768px';

      let resuelto = false;
      const limpiar = () => {
        resuelto = true;
        window.removeEventListener('message', alRecibirMensaje);
        clearTimeout(temporizador);
        iframe.remove();
      };

      const alRecibirMensaje = (evento: MessageEvent) => {
        if (resuelto || evento.source !== iframe.contentWindow || !evento.data) return;
        const mensaje = evento.data as MensajeEscaneoAxe;
        if (mensaje.tipo === 'resultado-escaneo-axe') {
          limpiar();
          resolve(mensaje.resultados);
        } else if (mensaje.tipo === 'error-escaneo-axe') {
          limpiar();
          reject(new Error(mensaje.mensaje));
        }
      };
      window.addEventListener('message', alRecibirMensaje);

      const temporizador = setTimeout(() => {
        if (resuelto) return;
        limpiar();
        reject(new Error('El escaneo automático ha tardado demasiado en responder.'));
      }, TIMEOUT_ESCANEO_MS);

      iframe.srcdoc = this.construirSrcdoc(html);
      document.body.appendChild(iframe);
    });
  }

  // axe.source (provisto por axe-core, pensado para inyección en otro
  // contexto) va ANTES del HTML pegado para que el parser lo reconozca de
  // forma fiable como <script> aunque el HTML pegado esté mal formado. Solo
  // se registra el listener de "load": el propio HTML pegado, colocado
  // después, todavía no existe en el DOM en el momento en que este primer
  // script se ejecuta.
  private construirSrcdoc(html: string): string {
    const runner = `
      ${axe.source}
      window.addEventListener('load', function () {
        axe.run(document, { runOnly: { type: 'tag', values: ${JSON.stringify(TAGS_WCAG_2_2_A_AA)} } })
          .then(function (resultados) {
            window.parent.postMessage({ tipo: 'resultado-escaneo-axe', resultados: resultados }, '*');
          })
          .catch(function (error) {
            window.parent.postMessage(
              { tipo: 'error-escaneo-axe', mensaje: String((error && error.message) || error) },
              '*',
            );
          });
      });
    `;
    return `<script>${runner}</script>${html}`;
  }
}

// fetch() de una data: URL no hace ninguna petición de red — el navegador la
// resuelve internamente —, así que es la forma más simple de convertirla a
// Blob sin decodificar base64 a mano.
async function dataUrlABlob(dataUrl: string): Promise<Blob> {
  const respuesta = await fetch(dataUrl);
  return respuesta.blob();
}
