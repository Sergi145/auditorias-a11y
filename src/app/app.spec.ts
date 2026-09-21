import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';
import { LayoutPublico } from './features/publico/layout-publico/layout-publico';
import { Shell } from './shared/shell/shell';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
      teardown: { destroyAfterEach: true },
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('la raíz redirige a la landing pública', async () => {
    const harness = await RouterTestingHarness.create();
    // La landing se pinta dentro de LayoutPublico (specs/24-vistas-publicas.md).
    await harness.navigateByUrl('/', LayoutPublico);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Auditorías de accesibilidad',
    );
  });

  it('el shell se muestra en las rutas internas de la app', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/auditorias', Shell);
    expect(harness.routeNativeElement?.querySelector('.shell__title')?.textContent).toContain(
      'Auditorías A11y',
    );
  });
});
