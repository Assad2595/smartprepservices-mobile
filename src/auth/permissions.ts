export type AuthUser = {
  id: number | string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  role: string;
  roles: string[];
  permissions: string[];
  companyId?: number | string | null;
  isInternal?: boolean;
};

export type AuthCompany = {
  id: number | string;
  name: string;
} | null;

export type AuthSession = {
  user: AuthUser;
  company: AuthCompany;
  roles: string[];
  permissions: string[];
  token?: string;
};

// Mobile app is operator-floor scoped: only Operator + Super Admin log in here.
// Admin flows may be added back later (see backend Authz::MOBILE_STAFF_ROLES).
const STAFF_ROLES = ['Super Admin', 'Operator'];

export function can(permissions: string[] | undefined, permission: string): boolean {
  return Boolean(permissions?.includes(permission));
}

export function hasRole(roles: string[] | undefined, role: string): boolean {
  return Boolean(roles?.includes(role));
}

export function hasAnyRole(roles: string[] | undefined, allowed: string[]): boolean {
  return Boolean(roles?.some((r) => allowed.includes(r)));
}

export function isMobileStaff(session: Pick<AuthUser, 'roles' | 'isInternal'> | null | undefined): boolean {
  if (!session) return false;
  if (session.isInternal === false) return false;
  return hasAnyRole(session.roles, STAFF_ROLES);
}

export function mapAuthSession(payload: any): AuthSession {
  const rawUser = payload?.user ?? payload ?? {};
  const roles: string[] = payload?.roles ?? rawUser?.roles ?? [];
  const permissions: string[] = payload?.permissions ?? rawUser?.permissions ?? [];
  const primaryRole = roles[0] ?? rawUser?.role ?? '';

  return {
    user: {
      id: rawUser.id,
      email: rawUser.email,
      firstName: rawUser.firstName ?? rawUser.first_name ?? '',
      lastName: rawUser.lastName ?? rawUser.last_name ?? '',
      name: rawUser.name,
      role: primaryRole,
      roles,
      permissions,
      companyId: rawUser.companyId ?? rawUser.company_id ?? null,
      isInternal: rawUser.isInternal ?? rawUser.is_internal ?? true,
    },
    company: payload?.company
      ? { id: payload.company.id, name: payload.company.name }
      : null,
    roles,
    permissions,
    token: payload?.token,
  };
}
