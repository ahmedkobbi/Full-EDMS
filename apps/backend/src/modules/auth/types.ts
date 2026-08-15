export interface JwtPayload {
  sub: string;          // user ID
  tid: string;          // tenant ID
  email: string;
  roles: string[];
  locale?: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    tenantId: string;
    roles: string[];
    locale: string;
    theme: string;
  };
  mfaRequired?: boolean;
  mfaTicket?: string;
}
