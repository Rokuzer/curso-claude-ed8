import { Component, inject, OnInit, DestroyRef } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { MesaStore } from '../../store/mesa.store'
import { TABLE_STATUS_LABELS, tableErrorMessage } from '../../models/mesa.model'

@Component({
  selector: 'app-mesa-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './mesa-list.component.html',
  styleUrl: './mesa-list.component.css'
})
export class MesaListComponent implements OnInit {
  readonly store = inject(MesaStore)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)
  readonly statusLabels = TABLE_STATUS_LABELS
  restaurantId = ''

  ngOnInit(): void {
    // The component is reused when only :restaurantId changes, so react to param changes
    this.route.parent?.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.restaurantId = params.get('restaurantId') ?? ''
      if (this.restaurantId) {
        this.store.loadByRestaurant(this.restaurantId)
      }
    })
  }

  async onDelete(id: string): Promise<void> {
    if (!this.restaurantId) return
    if (confirm('¿Estás seguro de eliminar esta mesa?')) {
      try {
        await this.store.delete(this.restaurantId, id)
      } catch (err) {
        alert(tableErrorMessage(err, 'Error al eliminar la mesa.'))
      }
    }
  }
}
