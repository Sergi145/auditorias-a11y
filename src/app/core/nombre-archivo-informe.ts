// Nombre de archivo compartido entre ExportacionExcelService y
// ExportacionPdfService — ver specs/09-exportacion.md. La fecha es la de
// generación del informe, no `fecha_inicio` de la auditoría, para que
// descargas de distintos días no se sobrescriban entre sí en la carpeta de
// Descargas.
export function nombreArchivoInforme(nombreAuditoria: string, extension: 'xlsx' | 'pdf'): string {
  const fecha = new Date().toISOString().slice(0, 10);
  return `${slugificar(nombreAuditoria)}-${fecha}.${extension}`;
}

// minúsculas, sin acentos, espacios y símbolos sustituidos por guiones. Si
// el nombre de la auditoría no deja ningún carácter alfanumérico tras el
// slug (solo símbolos o emoji), usa "auditoria" de respaldo para no
// generar un nombre de archivo vacío.
function slugificar(texto: string): string {
  const slug = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'auditoria';
}
