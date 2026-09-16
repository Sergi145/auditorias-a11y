import { nombreArchivoInforme } from './nombre-archivo-informe';

describe('nombreArchivoInforme', () => {
  const fechaHoy = new Date().toISOString().slice(0, 10);

  it('pasa a minúsculas y sustituye espacios por guiones', () => {
    expect(nombreArchivoInforme('Portal Corporativo', 'xlsx')).toBe(
      `portal-corporativo-${fechaHoy}.xlsx`,
    );
  });

  it('quita acentos', () => {
    expect(nombreArchivoInforme('Auditoría Núñez', 'pdf')).toBe(`auditoria-nunez-${fechaHoy}.pdf`);
  });

  it('sustituye símbolos como "/" por un solo guion, sin duplicarlos', () => {
    expect(nombreArchivoInforme('Cliente / Web 2026', 'xlsx')).toBe(
      `cliente-web-2026-${fechaHoy}.xlsx`,
    );
  });

  it('usa "auditoria" de respaldo si el nombre no deja caracteres alfanuméricos', () => {
    expect(nombreArchivoInforme('🚀🚀🚀', 'pdf')).toBe(`auditoria-${fechaHoy}.pdf`);
    expect(nombreArchivoInforme('', 'pdf')).toBe(`auditoria-${fechaHoy}.pdf`);
  });
});
