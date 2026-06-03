import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-jwt-secret-key-must-be-long-and-secure-12345"
);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "fallback-jwt-refresh-secret-key-must-be-long-and-secure"
);

export interface TokenPayload {
  userId: string;
  name: string;
  email: string;
  permissions: Record<string, string[]>; // { [moduleCode]: [permissions] }
}

export async function getUserPermissions(userId: string): Promise<Record<string, string[]>> {
  const userRoles = await prisma.user_roles.findMany({
    where: { user_id: userId },
    include: {
      role: {
        include: {
          role_module_permissions: {
            include: {
              module: true,
              permission: true,
            },
          },
        },
      },
    },
  });

  const permissions: Record<string, string[]> = {};

  for (const ur of userRoles) {
    for (const rmp of ur.role.role_module_permissions) {
      if (rmp.module.status !== 'ACTIVE' || rmp.permission.status !== 'ACTIVE') {
        continue;
      }
      const moduleCode = rmp.module.code;
      const permissionKey = rmp.permission.key;
      
      if (!permissions[moduleCode]) {
        permissions[moduleCode] = [];
      }
      if (!permissions[moduleCode].includes(permissionKey)) {
        permissions[moduleCode].push(permissionKey);
      }
    }
  }

  return permissions;
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

export async function signRefreshToken(userId: string): Promise<string> {
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as unknown as { userId: string };
  } catch (error) {
    return null;
  }
}
