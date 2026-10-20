import { Router } from 'express'
import { DiscountController } from '@controllers/discount.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteDiscountRepository } from '@repositories/discount.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { DiscountService } from '@services/discount.service.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const discountService = new DiscountService(
    new SqliteDiscountRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig)
)
const discountController = new DiscountController(discountService)

const router = Router({ mergeParams: true })

router.post('/', authenticate, authorize(['admin']), discountController.create)
router.get('/', authenticate, authorize(['admin', 'manager']), discountController.getAll)
router.get('/:id', authenticate, authorize(['admin', 'manager']), discountController.getById)
router.put('/:id', authenticate, authorize(['admin']), discountController.update)
router.delete('/:id', authenticate, authorize(['admin']), discountController.delete)

export { discountService, discountController }
export default router
