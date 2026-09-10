// Barrel of DTO/Model *types* only, one folder per entity (dto/model/mapper).
// `toDomain`/`toDTO` are NOT re-exported here: every entity's mapper uses
// those exact two names, so re-exporting all of them from one barrel would
// collide. Import a mapper from its own entity path instead, e.g.
// `import { toDomain as toBooking } from '@/shared/types/entities/booking'`.
export type {
  AmenityDTO,
  AmenityDto,
  AmenityCategoryDto,
  Amenity,
  AmenityCategory,
} from './amenity';
export type {
  BookingDTO,
  BookingDto,
  BookingStatusDto,
  CreateBookingDto,
  Booking,
  BookingStatus,
} from './booking';
export type { ChargeDTO, ChargeDto, ChargeStatusDto, Charge, ChargeStatus } from './charge';
export type { GuestDTO, GuestDto, GuestDocumentTypeDto, Guest, GuestDocumentType } from './guest';
export type {
  OrderDTO,
  OrderDto,
  OrderStatusDto,
  OrderItemDto,
  CreateOrderDto,
  Order,
  OrderStatus,
  OrderItem,
} from './order';
export type {
  AddPaymentDto,
  PaymentDTO,
  PaymentDto,
  PaymentMethodDto,
  PaymentStatusDto,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from './payment';
export type {
  ProductDTO,
  ProductDto,
  ProductCategoryDto,
  Product,
  ProductCategory,
} from './product';
export type { PromotionDto, Promotion } from './promotion';
export type { RateDTO, RateDto, Rate } from './rate';
export type { RoomDTO, RoomDto, RoomStatusDto, Room, RoomStatus } from './room';
export type { RoomTypeDto, RoomType } from './room-type';
export type {
  ServiceRequestDTO,
  ServiceRequestDto,
  ServiceRequestStatusDto,
  ServiceRequestTypeDto,
  CreateServiceRequestDto,
  ServiceRequest,
  ServiceRequestStatus,
  ServiceRequestType,
} from './service-request';
export type {
  UserDTO,
  UserDto,
  UserRoleDto,
  UserStatusDto,
  User,
  UserRole,
  UserStatus,
} from './user';

// `session/` (login/session response) is intentionally NOT re-exported here:
// it models a different concept than `user/` (PMS access role vs. staff job
// role) and importing both through one barrel risks a silent `User`/`UserDTO`
// name collision. Import it directly: `@/shared/types/entities/session`.
// See `src/modules/auth/README.md`.
