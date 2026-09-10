import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-proximamente',
  templateUrl: './proximamente.html',
})
export class Proximamente {
  protected readonly titulo = inject(ActivatedRoute).snapshot.data['titulo'] as string;
}
