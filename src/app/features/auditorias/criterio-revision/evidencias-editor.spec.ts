import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { EvidenciasEditor, crearControlEvidencia, type FormularioEvidencia } from './evidencias-editor';

function archivoImagen(nombre = 'captura.png', tipo = 'image/png'): File {
  return new File([new Uint8Array(10)], nombre, { type: tipo });
}

function seleccionarArchivos(fixture: ComponentFixture<EvidenciasEditor>, archivos: File[]): void {
  const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', { value: archivos, configurable: true });
  input.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

function botonesQuitar(fixture: ComponentFixture<EvidenciasEditor>): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('[aria-label^="Quitar imagen"]'));
}

function camposDescripcion(fixture: ComponentFixture<EvidenciasEditor>): HTMLInputElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('input[type="text"]'));
}

describe('EvidenciasEditor', () => {
  function crearFixture(inicial: FormularioEvidencia[] = []): {
    fixture: ComponentFixture<EvidenciasEditor>;
    array: FormArray<FormularioEvidencia>;
  } {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(EvidenciasEditor);
    const array = new FormArray<FormularioEvidencia>(inicial);
    fixture.componentRef.setInput('evidencias', array);
    fixture.detectChanges();
    return { fixture, array };
  }

  it('añade una imagen válida a la lista y mueve el foco a su descripción', () => {
    const { fixture, array } = crearFixture();

    seleccionarArchivos(fixture, [archivoImagen()]);

    expect(array.length).toBe(1);
    expect(array.at(0).controls.archivo.value).toBeInstanceOf(File);
    expect(document.activeElement).toBe(camposDescripcion(fixture)[0]);
  });

  it('acepta los archivos válidos y rechaza los demás de una selección mixta', () => {
    const { fixture, array } = crearFixture();
    const invalido = new File(['x'], 'informe.pdf', { type: 'application/pdf' });

    seleccionarArchivos(fixture, [archivoImagen('valida.png'), invalido]);

    expect(array.length).toBe(1);
    const errores: string = fixture.nativeElement.querySelector('ul').textContent;
    expect(errores).toContain('informe.pdf');
    expect(errores).toContain('formato no admitido');
  });

  it('no añade nada y no mueve el foco si se rechazan todos los archivos', () => {
    const { fixture, array } = crearFixture();
    const invalido = new File(['x'], 'informe.pdf', { type: 'application/pdf' });

    seleccionarArchivos(fixture, [invalido]);

    expect(array.length).toBe(0);
    expect(camposDescripcion(fixture)).toHaveLength(0);
  });

  it('la lista de errores se vacía en la siguiente selección', () => {
    const { fixture } = crearFixture();
    const invalido = new File(['x'], 'informe.pdf', { type: 'application/pdf' });
    seleccionarArchivos(fixture, [invalido]);
    expect(fixture.nativeElement.querySelector('ul')?.textContent).toContain('informe.pdf');

    seleccionarArchivos(fixture, [archivoImagen()]);

    const listaErrores = Array.from<HTMLUListElement>(fixture.nativeElement.querySelectorAll('ul')).find((ul) =>
      ul.textContent?.includes('informe.pdf'),
    );
    expect(listaErrores).toBeUndefined();
  });

  it('quitar una imagen intermedia mueve el foco al "Quitar imagen" siguiente', () => {
    const inicial = [
      crearControlEvidencia({ id: 1, archivo: new Blob(['a']), descripcion: 'Primera' }),
      crearControlEvidencia({ id: 2, archivo: new Blob(['b']), descripcion: 'Segunda' }),
      crearControlEvidencia({ id: 3, archivo: new Blob(['c']), descripcion: 'Tercera' }),
    ];
    const { fixture, array } = crearFixture(inicial);

    botonesQuitar(fixture)[0].click();
    fixture.detectChanges();

    expect(array.length).toBe(2);
    expect(array.at(0).controls.descripcion.value).toBe('Segunda');
    expect(document.activeElement).toBe(botonesQuitar(fixture)[0]);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Quitar imagen 1');
  });

  it('quitar la última imagen mueve el foco al "Quitar imagen" anterior', () => {
    const inicial = [
      crearControlEvidencia({ id: 1, archivo: new Blob(['a']), descripcion: 'Primera' }),
      crearControlEvidencia({ id: 2, archivo: new Blob(['b']), descripcion: 'Segunda' }),
    ];
    const { fixture, array } = crearFixture(inicial);

    botonesQuitar(fixture)[1].click();
    fixture.detectChanges();

    expect(array.length).toBe(1);
    expect(document.activeElement).toBe(botonesQuitar(fixture)[0]);
  });

  it('quitar la única imagen mueve el foco a "Adjuntar imagen"', () => {
    const inicial = [crearControlEvidencia({ id: 1, archivo: new Blob(['a']), descripcion: 'Única' })];
    const { fixture, array } = crearFixture(inicial);

    botonesQuitar(fixture)[0].click();
    fixture.detectChanges();

    expect(array.length).toBe(0);
    const botonAdjuntar: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(document.activeElement).toBe(botonAdjuntar);
  });

  it('permite volver a elegir el mismo archivo tras una selección', () => {
    const { fixture } = crearFixture();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    Object.defineProperty(input, 'files', { value: [archivoImagen()], configurable: true });

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(input.value).toBe('');
  });
});
