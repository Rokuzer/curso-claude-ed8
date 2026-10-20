import { Component, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { MesaStore } from '../../store/mesa.store'
import { MesaService } from '../../services/mesa.service'
import {
  TABLE_STATUSES, TABLE_STATUS_LABELS, tableErrorMessage,
  type TableStatus
} from '../../models/mesa.model'

interface MesaForm {
  number: number | null
  capacity: number | null
  description: string
  status: TableStatus
}

@Component({
  selector: 'app-mesa-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './mesa-form.component.html',
  styleUrl: './mesa-form.component.css'
})
export class MesaFormComponent implements OnInit {
  private readonly store = inject(MesaStore)
  private readonly service = inject(MesaService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  isEditing = false
  tableId: string | null = null
  restaurantId = ''
  loading = signal(false)
  error = signal<string | null>(null)

  statuses = TABLE_STATUSES
  statusLabels = TABLE_STATUS_LABELS

  form: MesaForm = {
    number: null,
    capacity: null,
    description: '',
    status: 'libre'
  }

  get pageTitle(): string {
    return this.isEditing ? 'Editar mesa' : 'Nueva mesa'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/mesas`
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (id && this.restaurantId) {
      this.isEditing = true
      this.tableId = id
      this.loadTable()
    }
  }

  private async loadTable(): Promise<void> {
    this.loading.set(true)
    try {
      const table = await firstValueFrom(this.service.getById(this.restaurantId, this.tableId!))
      this.form = {
        number: table.number,
        capacity: table.capacity,
        description: table.description ?? '',
        status: table.status
      }
    } catch {
      this.error.set('No se pudo cargar la mesa.')
    } finally {
      this.loading.set(false)
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.number === null || this.form.capacity === null) return
    this.error.set(null)
    this.loading.set(true)
    const dto = {
      number: this.form.number,
      capacity: this.form.capacity,
      description: this.form.description.trim() || null,
      status: this.form.status
    }
    try {
      if (this.isEditing && this.tableId) {
        await this.store.update(this.restaurantId, this.tableId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'mesas'])
    } catch (err) {
      this.error.set(tableErrorMessage(err, 'Error al guardar la mesa.'))
    } finally {
      this.loading.set(false)
    }
  }
}
