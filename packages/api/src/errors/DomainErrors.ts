import { AppError } from '@errors/AppError.js'

export class FirstNameRequiredError extends AppError {
  constructor() {
    super('First name is required')
  }
}

export class LastNameRequiredError extends AppError {
  constructor() {
    super('Last name is required')
  }
}

export class PasswordHashRequiredError extends AppError {
  constructor() {
    super('Password hash is required')
  }
}

export class InvalidRoleError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid role')
  }
}

export class InvalidEmailError extends AppError {
  constructor() {
    super('Invalid email format')
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('Invalid credentials')
  }
}

export class DuplicatedEmailError extends AppError {
  constructor() {
    super('Email is already in use')
  }
}

export class EmployeeNotFoundError extends AppError {
  constructor() {
    super('Employee not found')
  }
}

export class RestaurantNameRequiredError extends AppError {
  constructor() {
    super('Restaurant name is required')
  }
}

export class RestaurantAddressRequiredError extends AppError {
  constructor() {
    super('Restaurant address is required')
  }
}

export class RestaurantEmailRequiredError extends AppError {
  constructor() {
    super('Restaurant email is required')
  }
}

export class RestaurantNotFoundError extends AppError {
  constructor() {
    super('Restaurant not found')
  }
}

export class InvalidPhoneError extends AppError {
  constructor() {
    super('Invalid phone format')
  }
}

export class OwnerFirstNameRequiredError extends AppError {
  constructor() {
    super('Owner first name is required')
  }
}

export class OwnerLastNameRequiredError extends AppError {
  constructor() {
    super('Owner last name is required')
  }
}

export class IngredientNameRequiredError extends AppError {
  constructor() {
    super('Ingredient name is required')
  }
}

export class IngredientNotFoundError extends AppError {
  constructor() {
    super('Ingredient not found')
  }
}

export class InvalidUnitError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid unit')
  }
}

export class NegativeStockError extends AppError {
  constructor() {
    super('Stock cannot be negative')
  }
}

export class RestaurantIdRequiredError extends AppError {
  constructor() {
    super('Restaurant ID is required')
  }
}

export class DishNameRequiredError extends AppError {
  constructor() {
    super('Dish name is required')
  }
}

export class InvalidPriceError extends AppError {
  constructor() {
    super('Price must be a positive number')
  }
}

export class InvalidCategoryError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid category')
  }
}

export class DishNotFoundError extends AppError {
  constructor() {
    super('Dish not found')
  }
}

export class DatabaseNotInitializedError extends AppError {
  constructor() {
    super('Database is not initialized. Call dbConfig.initialize() first.')
  }
}

export class InvalidOrderStatusError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid order status')
  }
}

export class OrderNotFoundError extends AppError {
  constructor() {
    super('Order not found')
  }
}


export class TableNotFoundError extends AppError {
  constructor() {
    super('Table not found')
  }
}

export class InvalidTableNumberError extends AppError {
  constructor() {
    super('Table number must be an integer greater than or equal to 1')
  }
}

export class InvalidTableCapacityError extends AppError {
  constructor() {
    super('Table capacity must be an integer greater than or equal to 1')
  }
}

export class InvalidTableDescriptionError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid table description')
  }
}

export class InvalidTableStatusError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid table status')
  }
}

export class InvalidPartySizeError extends AppError {
  constructor() {
    super('Party size must be an integer greater than or equal to 1')
  }
}

export class TableCapacityExceededError extends AppError {
  constructor() {
    super('Party size exceeds the table capacity')
  }
}

export class DuplicatedTableNumberError extends AppError {
  constructor() {
    super('A table with this number already exists in the restaurant')
  }
}

export class TableInUseError extends AppError {
  constructor() {
    super('Table is occupied and cannot be deleted')
  }
}

export class TableNotAvailableError extends AppError {
  constructor() {
    super('Table is not available')
  }
}

export class TableNotOccupiedError extends AppError {
  constructor() {
    super('Table is not occupied')
  }
}

export class InvalidDiscountTypeError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid discount type')
  }
}

export class DiscountCodeRequiredError extends AppError {
  constructor() {
    super('Discount code is required')
  }
}

export class InvalidDiscountValueError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Discount value must be a positive number')
  }
}

export class InvalidDiscountExpirationError extends AppError {
  constructor() {
    super('Discount expiration must be a valid date')
  }
}

export class InvalidDiscountMaxUsesError extends AppError {
  constructor() {
    super('Discount max uses must be an integer greater than or equal to 1')
  }
}

export class DiscountCodeNotFoundError extends AppError {
  constructor() {
    super('Discount code not found')
  }
}

export class DiscountCodeInvalidError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Discount code is not valid')
  }
}

export class DuplicatedDiscountCodeError extends AppError {
  constructor() {
    super('A discount code with this value already exists in the restaurant')
  }
}

export class InvalidPointsRuleError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid points rule')
  }
}

export class PointsRuleNotFoundError extends AppError {
  constructor() {
    super('Points rule not found')
  }
}

export class DuplicatedPointsRuleError extends AppError {
  constructor() {
    super('A points rule with this amount of points already exists in the restaurant')
  }
}

export class InsufficientPointsError extends AppError {
  constructor() {
    super('Not enough points to redeem this rule')
  }
}

export class BillAlreadyRequestedError extends AppError {
  constructor() {
    super('The bill for this order was already requested')
  }
}

export class BillNotFoundError extends AppError {
  constructor() {
    super('Bill not found')
  }
}
