import { Component, ElementRef, model, input, viewChildren } from '@angular/core';

export interface TabItem {
  id: string;
  label: string;
}

// Patrón ARIA "tabs" (roving tabindex, flechas/Home/End) — sustituye
// <mat-tab-group>. Quien lo usa renderiza los paneles (role="tabpanel")
// enlazados por id a partir de `tab.id`, ver pagina-escaneo.html. Ver
// specs/04-rediseno-tailwind.md.
@Component({
  selector: 'app-tabs',
  template: `
    <div role="tablist" [attr.aria-label]="label()" class="flex gap-1 border-b border-slate-200">
      @for (tab of tabs(); track tab.id; let i = $index) {
        <button
          #tabButton
          type="button"
          role="tab"
          [id]="tab.id + '-tab'"
          [attr.aria-selected]="i === selectedIndex()"
          [attr.aria-controls]="tab.id + '-panel'"
          [tabIndex]="i === selectedIndex() ? 0 : -1"
          class="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
          [class.border-violet-700]="i === selectedIndex()"
          [class.text-violet-700]="i === selectedIndex()"
          [class.border-transparent]="i !== selectedIndex()"
          [class.text-slate-600]="i !== selectedIndex()"
          [class.hover:text-slate-900]="i !== selectedIndex()"
          (click)="select(i)"
          (keydown)="onKeydown($event, i)"
        >
          {{ tab.label }}
        </button>
      }
    </div>
  `,
})
export class AppTabs {
  readonly tabs = input.required<TabItem[]>();
  readonly label = input('');
  readonly selectedIndex = model(0);

  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  protected select(i: number): void {
    this.selectedIndex.set(i);
  }

  protected onKeydown(event: KeyboardEvent, i: number): void {
    const total = this.tabs().length;
    let siguiente: number;
    if (event.key === 'ArrowRight') siguiente = (i + 1) % total;
    else if (event.key === 'ArrowLeft') siguiente = (i - 1 + total) % total;
    else if (event.key === 'Home') siguiente = 0;
    else if (event.key === 'End') siguiente = total - 1;
    else return;

    event.preventDefault();
    this.selectedIndex.set(siguiente);
    this.tabButtons()[siguiente]?.nativeElement.focus();
  }
}
