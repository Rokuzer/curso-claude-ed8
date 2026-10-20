import { randomUUID } from 'crypto'
import type { PointsRule } from '@models/discount.model.js'
import type { PointsRepository } from '@repositories/points.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import { RestaurantNotFoundError, InvalidPointsRuleError, DuplicatedPointsRuleError, PointsRuleNotFoundError } from '@errors/DomainErrors.js'

export interface PointsRuleInput {
    points: number
    discountAmount: number
}

export class PointsService {
    constructor(
        private readonly pointsRepository: PointsRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async createRule(restaurantId: string, input: PointsRuleInput): Promise<PointsRule> {
        await this.ensureRestaurantExists(restaurantId)
        this.validate(input)
        await this.ensurePointsAvailable(restaurantId, input.points)

        const rule: PointsRule = { id: randomUUID(), restaurantId, points: input.points, discountAmount: input.discountAmount }
        await this.pointsRepository.saveRule(rule)
        return rule
    }

    async listRules(restaurantId: string): Promise<PointsRule[]> {
        await this.ensureRestaurantExists(restaurantId)
        return this.pointsRepository.findRulesByRestaurantId(restaurantId)
    }

    async updateRule(restaurantId: string, id: string, input: PointsRuleInput): Promise<PointsRule> {
        const existing = await this.getRule(restaurantId, id)
        this.validate(input)
        if (input.points !== existing.points) {
            await this.ensurePointsAvailable(restaurantId, input.points)
        }

        const updated: PointsRule = { ...existing, points: input.points, discountAmount: input.discountAmount }
        await this.pointsRepository.saveRule(updated)
        return updated
    }

    async deleteRule(restaurantId: string, id: string): Promise<void> {
        await this.getRule(restaurantId, id)
        await this.pointsRepository.deleteRule(id)
    }

    async getBalance(clientId: string, restaurantId: string): Promise<number> {
        await this.ensureRestaurantExists(restaurantId)
        return this.pointsRepository.getBalance(clientId, restaurantId)
    }

    private async getRule(restaurantId: string, id: string): Promise<PointsRule> {
        const rule = await this.pointsRepository.findRuleById(id)
        if (!rule || rule.restaurantId !== restaurantId) {
            throw new PointsRuleNotFoundError()
        }
        return rule
    }

    private async ensureRestaurantExists(restaurantId: string): Promise<void> {
        if (!await this.restaurantRepository.findById(restaurantId)) {
            throw new RestaurantNotFoundError()
        }
    }

    private async ensurePointsAvailable(restaurantId: string, points: number): Promise<void> {
        if (await this.pointsRepository.findRuleByPoints(restaurantId, points)) {
            throw new DuplicatedPointsRuleError()
        }
    }

    private validate(input: PointsRuleInput): void {
        if (typeof input.points !== 'number' || !Number.isInteger(input.points) || input.points < 1) {
            throw new InvalidPointsRuleError('Points must be an integer greater than or equal to 1')
        }
        if (typeof input.discountAmount !== 'number' || !Number.isFinite(input.discountAmount) || input.discountAmount <= 0) {
            throw new InvalidPointsRuleError('Discount amount must be a positive number')
        }
    }
}
