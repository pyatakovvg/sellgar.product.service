export enum OrderStatus {
  PENDING = 'pending', // Ожидание подтверждения
  CONFIRMED = 'confirmed', // Подтвержден, ожидает оплаты
  PAID = 'paid', // Оплачен
  PROCESSING = 'processing', // В обработке
  READY_FOR_SHIPPING = 'ready_for_shipping', // Готов к отгрузке
  SHIPPED = 'shipped', // Отправлен
  DELIVERED = 'delivered', // Доставлен
  COMPLETED = 'completed', // Завершен
  CANCELLED = 'cancelled', // Отменен
  REFUNDED = 'refunded', // Возврат
  ON_HOLD = 'on_hold', // На удержании
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
