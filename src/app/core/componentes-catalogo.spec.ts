import { CATALOGO_COMPONENTES_BOOTSTRAP, idiomaNombreComponente } from './componentes-catalogo';

describe('idiomaNombreComponente', () => {
  it('marca como inglés los nombres Bootstrap', () => {
    const modal = CATALOGO_COMPONENTES_BOOTSTRAP.find((componente) => componente.nombre === 'Modal')!;
    expect(idiomaNombreComponente(modal)).toBe('en');
  });

  it('no marca «Tabla», el único nombre del catálogo en español', () => {
    const tabla = CATALOGO_COMPONENTES_BOOTSTRAP.find((componente) => componente.nombre === 'Tabla')!;
    expect(idiomaNombreComponente(tabla)).toBeNull();
  });

  it('no marca los componentes personalizados: su idioma es desconocido', () => {
    expect(idiomaNombreComponente({ origen: 'personalizado', nombre: 'Chip de filtro' })).toBeNull();
  });
});
