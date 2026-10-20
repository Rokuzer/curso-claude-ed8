import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const tableService = new TableService(
    new SqliteTableRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig),
    new SqliteOrderRepository(dbConfig)
)
const tableController = new TableController(tableService)

const router = Router({ mergeParams: true })

const staff = ['admin', 'manager', 'camarero', 'cocinero']

router.post('/', authenticate, authorize(['admin', 'manager']), tableController.create)
router.get('/', authenticate, authorize(staff), tableController.getAll)
router.get('/:id', authenticate, authorize(staff), tableController.getById)
router.put('/:id', authenticate, authorize(['admin', 'manager']), tableController.update)
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tableController.delete)
router.patch('/:id/status', authenticate, authorize(staff), tableController.updateStatus)
router.get('/:id/orders', authenticate, authorize(staff), tableController.getOrders)
router.post('/:id/occupy', authenticate, authorize(['cliente']), tableController.occupy)

export { tableService, tableController }
export default router
