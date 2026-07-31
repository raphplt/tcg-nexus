import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

const PRIVATE_ACCOUNT_FIELDS = new Set([
  "password",
  "refreshToken",
  "previousRefreshToken",
  "previousRefreshTokenExpiresAt",
]);

const PRIVATE_USER_FIELDS = new Set([
  "email",
  "role",
  "preferredCurrency",
  "isActive",
  "emailVerified",
]);

const PRIVATE_ORGANIZER_FIELDS = new Set(["email", "phone"]);
const PRIVATE_REGISTRATION_FIELDS = new Set([
  "notes",
  "paidAmount",
  "paymentCompleted",
  "paymentDueDate",
  "confirmationCode",
  "payments",
]);

@Injectable()
export class PublicTournamentDataInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((value) => this.sanitize(value)));
  }

  private sanitize(value: unknown): unknown {
    if (value === null || typeof value !== "object" || value instanceof Date) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    const record = value as Record<string, unknown>;
    const isUser =
      "email" in record && ("firstName" in record || "lastName" in record);
    const isOrganizer =
      "email" in record && "name" in record && "role" in record;
    const isRegistration =
      "registeredAt" in record &&
      "checkedIn" in record &&
      "status" in record &&
      "player" in record;

    return Object.fromEntries(
      Object.entries(record)
        .filter(([key]) => !PRIVATE_ACCOUNT_FIELDS.has(key))
        .filter(([key]) => !isUser || !PRIVATE_USER_FIELDS.has(key))
        .filter(([key]) => !isOrganizer || !PRIVATE_ORGANIZER_FIELDS.has(key))
        .filter(
          ([key]) => !isRegistration || !PRIVATE_REGISTRATION_FIELDS.has(key),
        )
        .map(([key, nestedValue]) => [key, this.sanitize(nestedValue)]),
    );
  }
}
