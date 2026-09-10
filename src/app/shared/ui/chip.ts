import { Component } from '@angular/core';

// Insignia neutra — sustituye <mat-chip>. Agrupar varias dentro de un
// <ul aria-label="..."> con clase "flex flex-wrap gap-2 list-none p-0 m-0"
// (sustituye <mat-chip-set>), ver specs/04-rediseno-tailwind.md.
@Component({
  selector: 'app-chip',
  host: {
    class: 'inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700',
  },
  template: `<ng-content />`,
})
export class AppChip {}
