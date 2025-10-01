import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  isCollapsed = signal(false);

  toggle() {
    this.isCollapsed.update(value => !value);
  }

  collapse() {
    this.isCollapsed.set(true);
  }

  expand() {
    this.isCollapsed.set(false);
  }
}
