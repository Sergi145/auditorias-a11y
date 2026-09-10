import { Component, input } from '@angular/core';

// Iconos propios, trazo simple (outline 24x24) — ver
// specs/04-rediseno-tailwind.md. Deliberadamente no copian path data de
// ningún set con licencia externa (Material Symbols, Lucide, etc.).
export type IconName =
  | 'menu'
  | 'add'
  | 'arrow-back'
  | 'download'
  | 'info'
  | 'insights'
  | 'document'
  | 'search'
  | 'table'
  | 'clipboard-check'
  | 'book'
  | 'grid'
  | 'alert-triangle'
  | 'alert-circle'
  | 'check-circle'
  | 'x-circle'
  | 'minus-circle'
  | 'help-circle';

@Component({
  selector: 'app-icon',
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('menu') {
          <path d="M3 6h18M3 12h18M3 18h18" />
        }
        @case ('add') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('arrow-back') {
          <path d="M19 12H5m6 7-7-7 7-7" />
        }
        @case ('download') {
          <path d="M12 3v11m0 0-4-4m4 4 4-4" />
          <path d="M4 20h16" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        }
        @case ('insights') {
          <path d="M4 19h16" />
          <path d="M7 15l3-4 3 2 4-6" />
        }
        @case ('document') {
          <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 16h6" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        }
        @case ('table') {
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <path d="M3 10h18M9 4v16" />
        }
        @case ('clipboard-check') {
          <rect x="6" y="4" width="12" height="17" rx="1" />
          <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
          <path d="M9 13l2 2 4-4" />
        }
        @case ('book') {
          <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 0-2 2V5Z" />
          <path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 1 2 2V5Z" />
        }
        @case ('grid') {
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="8" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
          <rect x="13" y="13" width="8" height="8" rx="1" />
        }
        @case ('alert-triangle') {
          <path d="M12 3 2 20h20L12 3Z" />
          <path d="M12 10v4" />
          <path d="M12 17h.01" />
        }
        @case ('alert-circle') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        }
        @case ('check-circle') {
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 5-5" />
        }
        @case ('x-circle') {
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5l5 5m0-5-5 5" />
        }
        @case ('minus-circle') {
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8" />
        }
        @case ('help-circle') {
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 4.6 1.35c0 1.65-2.1 2.15-2.1 3.65" />
          <path d="M12 17h.01" />
        }
      }
    </svg>
  `,
})
export class AppIcon {
  readonly name = input.required<IconName>();
}
