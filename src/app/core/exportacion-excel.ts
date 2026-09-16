import { Injectable, inject } from '@angular/core';
import { utils, writeFile } from 'xlsx';
import { InformeDatosService, type InformeAuditoria } from './informe-datos';
import type { CategoriaWCAG, EstadoResultado, Severidad } from './models';
import { nombreArchivoInforme } from './nombre-archivo-informe';

const ETIQUETA_ESTADO: Record<EstadoResultado, string> = {
  pasa: 'Pasa',
  falla: 'Falla',
  no_aplica: 'No aplica',
  por_revisar: 'Por revisar',
};

const ETIQUETA_CATEGORIA: Record<CategoriaWCAG, string> = {
  perceptible: 'Perceptible',
  operable: 'Operable',
  comprensible: 'Comprensible',
  robusto: 'Robusto',
};

const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export interface FilaChecklistExcel {
  Página: string;
  'Código de criterio': string;
  'Nombre de criterio': string;
  Nivel: string;
  Categoría: string;
  Estado: string;
}

export interface FilaHallazgoExcel {
  Página: string;
  'Código de criterio': string;
  Severidad: string;
  Componente: string;
  Notas: string;
}

// Excel del informe de auditoría — ver specs/09-exportacion.md. Construye
// las filas a partir de InformeDatosService (sin volver a consultar Dexie)
// y dispara la descarga con SheetJS. filasChecklist()/filasHallazgos() son
// públicos para poder testear la forma de las filas sin invocar la
// descarga real del archivo binario.
@Injectable({ providedIn: 'root' })
export class ExportacionExcelService {
  private readonly informeDatosService = inject(InformeDatosService);

  async generar(auditoriaId: number): Promise<void> {
    const informe = await this.informeDatosService.ensamblar(auditoriaId);
    if (!informe) throw new Error('No se ha encontrado la auditoría.');

    const libro = utils.book_new();
    utils.book_append_sheet(libro, utils.json_to_sheet(this.filasChecklist(informe)), 'Checklist');
    utils.book_append_sheet(libro, utils.json_to_sheet(this.filasHallazgos(informe)), 'Hallazgos');

    writeFile(libro, nombreArchivoInforme(informe.auditoria.nombre, 'xlsx'));
  }

  filasChecklist(informe: InformeAuditoria): FilaChecklistExcel[] {
    return informe.checklist.map((fila) => ({
      Página: fila.pagina.nombre,
      'Código de criterio': fila.criterio.codigo,
      'Nombre de criterio': fila.criterio.nombre,
      Nivel: fila.criterio.nivel,
      Categoría: ETIQUETA_CATEGORIA[fila.criterio.categoria],
      Estado: ETIQUETA_ESTADO[fila.estado],
    }));
  }

  filasHallazgos(informe: InformeAuditoria): FilaHallazgoExcel[] {
    return informe.hallazgos.map((hallazgo) => ({
      Página: hallazgo.pagina.nombre,
      'Código de criterio': hallazgo.criterio.codigo,
      Severidad: ETIQUETA_SEVERIDAD[hallazgo.severidad],
      Componente: hallazgo.componenteNombre ?? '',
      Notas: hallazgo.notas,
    }));
  }
}
