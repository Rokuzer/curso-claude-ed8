import { Router } from 'express'
import { PointsController } from '@controllers/points.controller.js'
import { dbConfig } from '@config/database.js'
import { SqlitePointsRepository } from '@repositories/points.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { PointsService } from '@services/points.service.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const pointsService = new PointsService(
    new SqlitePointsRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig)
)
const pointsController = new PointsController(pointsService)

const rulesRouter = Router({ mergeParams: true })

rulesRouter.post('/', authenticate, authorize(['admin']), pointsController.createRule)
rulesRouter.get('/', authenticate, authorize(['admin', 'manager', 'cliente']), pointsController.getRules)
rulesRouter.put('/:id', authenticate, authorize(['admin']), pointsController.updateRule)
rulesRouter.delete('/:id', authenticate, authorize(['admin']), pointsController.deleteRule)

const myPointsRouter = Router({ mergeParams: true })

myPointsRouter.get('/me', authenticate, authorize(['cliente']), pointsController.getMyBalance)

export { pointsService, pointsController, myPointsRouter }
export default rulesRouter
