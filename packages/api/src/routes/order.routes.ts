import { Router } from 'express'
import { OrderController } from '@controllers/order.controller.js'
import { OrderService } from '@services/order.service.js'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteBillRepository } from '@repositories/bill.repository.js'
import { SqliteDiscountRepository } from '@repositories/discount.repository.js'
import { SqlitePointsRepository } from '@repositories/points.repository.js'
import { BillController } from '@controllers/bill.controller.js'
import { BillService } from '@services/bill.service.js'
import { dbConfig } from '@config/database.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const orderRepository = new SqliteOrderRepository(dbConfig)
const orderService = new OrderService(orderRepository, new SqliteTableRepository(dbConfig))
const orderController = new OrderController(orderService)
const billController = new BillController(new BillService(
    new SqliteBillRepository(dbConfig),
    orderRepository,
    new SqliteDiscountRepository(dbConfig),
    new SqlitePointsRepository(dbConfig)
))

const router = Router()

router.post('/', authenticate, orderController.createOrder.bind(orderController))
router.get('/active', authenticate, orderController.getActiveOrders.bind(orderController))
router.get('/mine', authenticate, orderController.getMyOrders.bind(orderController))
router.get('/:id', authenticate, orderController.getById.bind(orderController))
router.post('/:id/bill', authenticate, authorize(['cliente']), billController.requestBill)
router.get('/:id/bill', authenticate, authorize(['cliente']), billController.getBill)
router.patch('/:orderId/items/:itemId/status', authenticate, orderController.updateItemStatus.bind(orderController))

export default router
