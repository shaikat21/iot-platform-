// iot-frontend/src/app/core/auth/auth.types.ts
import { UserRoles } from '../../shared/enums/user-roles.enum';

export interface AuthSession {
  authenticated: boolean;
  userId?: string;
  roles: UserRoles[];
  isAdmin?: boolean;
  isUser?: boolean;
}