import { Component, inject } from '@angular/core';
import { StoreService } from '../../store.service';
import { LucideAngularModule, Search } from 'lucide-angular';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './search-bar.html'
})
export class SearchBar {
  store = inject(StoreService);
  readonly Search = Search;

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.store.setSearchTerm(input.value.toUpperCase());
  }
}
