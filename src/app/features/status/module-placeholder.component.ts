import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

@Component({
  selector: 'app-module-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <div class="cj-page-header">
      <h1 class="cj-page-title">{{ title }}</h1>
    </div>
    <app-empty-state
      [title]="title"
      [description]="description"
      [showMascot]="true"
    />
  `,
})
export class ModulePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = String(this.route.snapshot.data['title'] ?? 'CreatingJ');
  protected readonly description = String(
    this.route.snapshot.data['description'] ?? 'Módulo em implementação nas próximas fases SDD.',
  );
}
