export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export interface Table {
  id: string
  restaurantId: string
  number: number
  description: string | null
  capacity: number
  status: TableStatus
  occupiedAt: string | null
  occupiedBy: string | null
}

export interface TableInputDto {
  number: number
  capacity: number
  description?: string | null
  status?: TableStatus
}

export type CreateTableDto = TableInputDto
export type UpdateTableDto = TableInputDto

export const TABLE_STATUSES: TableStatus[] = ['libre', 'ocupada', 'reservada']

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada'
}

export const TABLE_ERROR_MESSAGES: Record<string, string> = {
  DuplicatedTableNumberError: 'Ya existe una mesa con ese número en el restaurante.',
  TableInUseError: 'No se puede eliminar una mesa ocupada. Libérala primero.',
  InvalidTableNumberError: 'El número de mesa debe ser un entero mayor o igual que 1.',
  InvalidTableCapacityError: 'La capacidad debe ser un entero mayor o igual que 1.',
  InvalidTableDescriptionError: 'La descripción no puede superar los 200 caracteres.',
  InvalidTableStatusError: 'Estado de mesa no válido.',
  TableNotFoundError: 'La mesa no existe.',
  RestaurantNotFoundError: 'El restaurante no existe.'
}

export function tableErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { error?: { error?: string } })?.error?.error
  return (code && TABLE_ERROR_MESSAGES[code]) || fallback
}
