import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DatabaseService } from './core/database';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  // Inyectar el servicio aquí abre (o crea) la base de datos IndexedDB al
  // arrancar la app — ver criterios de aceptación de specs/01-fundacion.md.
  private readonly database = inject(DatabaseService);
}
