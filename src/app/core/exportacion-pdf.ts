import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { InformeDatosService, type HallazgoInforme, type InformeAuditoria } from './informe-datos';
import type { CriterioWCAG, Pagina, Severidad } from './models';
import { nombreArchivoInforme } from './nombre-archivo-informe';

const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

const ORDEN_SEVERIDAD: Severidad[] = ['critica', 'alta', 'media', 'baja'];

const MARGEN = 14;

// jspdf-autotable asigna `lastAutoTable` sobre la instancia de jsPDF en
// tiempo de ejecución (tanto con la función independiente autoTable() como
// con applyPlugin()); el paquete no lo declara en sus tipos porque
// jsPDFDocument está tipado como `any` — ver specs/09-exportacion.md.
type DocConAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

export interface GrupoCriterioInforme {
  criterio: CriterioWCAG;
  hallazgos: HallazgoInforme[];
}

export interface GrupoPaginaInforme {
  pagina: Pagina;
  criterios: GrupoCriterioInforme[];
}

// PDF del informe de auditoría — ver specs/09-exportacion.md. Construye el
// contenido a partir de InformeDatosService (sin volver a consultar Dexie)
// y dispara la descarga con jsPDF + jspdf-autotable. Los métodos que dan
// forma a los datos (resumenEjecutivoLineas/filasTablaHallazgos/
// agruparPorPaginaYCriterio) son públicos para poder testearlos sin
// generar el binario — mismo patrón que ExportacionExcelService. Solo
// texto: sin capturas ni imágenes (ver "Qué NO entra todavía" del spec).
@Injectable({ providedIn: 'root' })
export class ExportacionPdfService {
  private readonly informeDatosService = inject(InformeDatosService);

  async generar(auditoriaId: number): Promise<void> {
    const informe = await this.informeDatosService.ensamblar(auditoriaId);
    if (!informe) throw new Error('No se ha encontrado la auditoría.');

    const doc = new jsPDF();
    let cursorY = this.dibujarResumenEjecutivo(doc, informe);
    cursorY = this.dibujarTablaHallazgos(doc, informe, cursorY);
    this.dibujarDetallePorCriterio(doc, informe, cursorY);

    doc.save(nombreArchivoInforme(informe.auditoria.nombre, 'pdf'));
  }

  resumenEjecutivoLineas(informe: InformeAuditoria): string[] {
    const { auditoria, progreso } = informe;
    const { critica, alta, media, baja } = progreso.fallosPorSeveridad;
    return [
      `Cliente: ${auditoria.cliente}`,
      `Estándar objetivo: WCAG 2.2 ${auditoria.estandar_objetivo}`,
      `Revisado: ${progreso.porcentajeRevisado}% (${progreso.revisados}/${progreso.totalCriterios} criterios)`,
      `Fallos por severidad: Crítica ${critica} · Alta ${alta} · Media ${media} · Baja ${baja}`,
      `Fecha de generación: ${new Date().toISOString().slice(0, 10)}`,
    ];
  }

  // Una fila por Hallazgo, ordenada por severidad (crítica → alta → media →
  // baja) — orden estable, así que dos hallazgos de la misma severidad
  // conservan el orden de aparición (página, luego criterio).
  filasTablaHallazgos(informe: InformeAuditoria): string[][] {
    return [...informe.hallazgos]
      .sort((a, b) => ORDEN_SEVERIDAD.indexOf(a.severidad) - ORDEN_SEVERIDAD.indexOf(b.severidad))
      .map((hallazgo) => [
        hallazgo.pagina.nombre,
        hallazgo.criterio.codigo,
        ETIQUETA_SEVERIDAD[hallazgo.severidad],
        hallazgo.componenteNombre ?? '',
        hallazgo.notas,
      ]);
  }

  // Agrupa los hallazgos ya en InformeAuditoria (solo los de criterios en
  // "falla") por página y, dentro de cada página, por criterio — para el
  // detalle del PDF. Una página u otro criterio sin hallazgos no aparece.
  agruparPorPaginaYCriterio(informe: InformeAuditoria): GrupoPaginaInforme[] {
    return informe.paginas
      .map((pagina) => {
        const criterios = new Map<string, GrupoCriterioInforme>();
        for (const hallazgo of informe.hallazgos) {
          if (hallazgo.pagina.id !== pagina.id) continue;
          const grupo = criterios.get(hallazgo.criterio.codigo);
          if (grupo) {
            grupo.hallazgos.push(hallazgo);
          } else {
            criterios.set(hallazgo.criterio.codigo, { criterio: hallazgo.criterio, hallazgos: [hallazgo] });
          }
        }
        return { pagina, criterios: [...criterios.values()] };
      })
      .filter((grupo) => grupo.criterios.length > 0);
  }

  private dibujarResumenEjecutivo(doc: jsPDF, informe: InformeAuditoria): number {
    let y = 20;
    doc.setFontSize(16);
    doc.text(`Informe de auditoría: ${informe.auditoria.nombre}`, MARGEN, y);
    y += 10;

    doc.setFontSize(11);
    for (const linea of this.resumenEjecutivoLineas(informe)) {
      doc.text(linea, MARGEN, y);
      y += 6;
    }
    return y + 6;
  }

  private dibujarTablaHallazgos(doc: jsPDF, informe: InformeAuditoria, startY: number): number {
    const filas = this.filasTablaHallazgos(informe);
    if (filas.length === 0) return startY;

    doc.setFontSize(13);
    doc.text('Hallazgos por severidad', MARGEN, startY);

    autoTable(doc, {
      startY: startY + 4,
      margin: { left: MARGEN, right: MARGEN },
      head: [['Página', 'Criterio', 'Severidad', 'Componente', 'Notas']],
      body: filas,
    });

    return (doc as DocConAutoTable).lastAutoTable.finalY + 10;
  }

  private dibujarDetallePorCriterio(doc: jsPDF, informe: InformeAuditoria, startY: number): void {
    const grupos = this.agruparPorPaginaYCriterio(informe);
    if (grupos.length === 0) return;

    const alturaPagina = doc.internal.pageSize.getHeight();
    const anchoPagina = doc.internal.pageSize.getWidth();
    let y = this.asegurarEspacio(doc, startY, alturaPagina, 14);

    doc.setFontSize(13);
    doc.text('Detalle por criterio en falla', MARGEN, y);
    y += 8;

    for (const { pagina, criterios } of grupos) {
      y = this.asegurarEspacio(doc, y, alturaPagina, 10);
      doc.setFontSize(12);
      doc.text(pagina.nombre, MARGEN, y);
      y += 6;

      for (const { criterio, hallazgos } of criterios) {
        y = this.asegurarEspacio(doc, y, alturaPagina, 8);
        doc.setFontSize(10);
        doc.text(`${criterio.codigo} · ${criterio.nombre}`, MARGEN + 4, y);
        y += 5;

        for (const hallazgo of hallazgos) {
          const texto = `${ETIQUETA_SEVERIDAD[hallazgo.severidad]}${
            hallazgo.componenteNombre ? ` · ${hallazgo.componenteNombre}` : ''
          } — ${hallazgo.notas}`;
          const lineas: string[] = doc.splitTextToSize(texto, anchoPagina - MARGEN * 2 - 8);
          y = this.asegurarEspacio(doc, y, alturaPagina, lineas.length * 5);
          doc.text(lineas, MARGEN + 8, y);
          y += lineas.length * 5;
        }
        y += 3;
      }
      y += 4;
    }
  }

  private asegurarEspacio(doc: jsPDF, y: number, alturaPagina: number, necesario: number): number {
    if (y + necesario <= alturaPagina - MARGEN) return y;
    doc.addPage();
    return 20;
  }
}
