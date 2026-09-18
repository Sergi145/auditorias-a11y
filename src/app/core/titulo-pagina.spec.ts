import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NOMBRE_APP, TituloPagina } from './titulo-pagina';

@Component({ template: '' })
class Vacia {}

describe('TituloPagina', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'con-titulo', title: 'Progreso de la auditoría', component: Vacia },
          {
            path: 'criterios/:codigo',
            title: (ruta) => `Revisión del criterio ${ruta.paramMap.get('codigo')}`,
            component: Vacia,
          },
          { path: 'sin-titulo', component: Vacia },
        ]),
        { provide: TitleStrategy, useClass: TituloPagina },
      ],
      teardown: { destroyAfterEach: true },
    });
  });

  it('pone el título de la ruta seguido del nombre de la app', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/con-titulo');
    expect(TestBed.inject(Title).getTitle()).toBe(`Progreso de la auditoría · ${NOMBRE_APP}`);
  });

  it('resuelve títulos que dependen de los parámetros de la ruta', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/criterios/1.1.1');
    expect(TestBed.inject(Title).getTitle()).toBe(`Revisión del criterio 1.1.1 · ${NOMBRE_APP}`);
  });

  it('sin título en la ruta deja solo el nombre de la app', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/sin-titulo');
    expect(TestBed.inject(Title).getTitle()).toBe(NOMBRE_APP);
  });
});
