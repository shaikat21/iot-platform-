export interface AuthSession {
  ok?: boolean;
  user?: {
    id?: string;
    userId?: string;
    roles?: string[];
  };
}
