import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, TokenPayload, getUserPermissions } from "./auth";

export interface RBACCheckResult {
  authorized: boolean;
  payload?: TokenPayload;
  errorResponse?: NextResponse;
}

/**
 * Checks if the request is authenticated and has the required module permission.
 * If not authorized, returns an appropriate NextResponse (401/403).
 */
export async function checkApiPermission(
  request: NextRequest,
  moduleCode: string,
  permissionKey: string
): Promise<RBACCheckResult> {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "Unauthorized. Authentication token is missing." },
        { status: 401 }
      ),
    };
  }

  const payload = await verifyAccessToken(accessToken);

  if (!payload) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "Unauthorized. Session has expired or is invalid." },
        { status: 401 }
      ),
    };
  }

  const livePermissions = await getUserPermissions(payload.userId);
  const userPermissions = livePermissions[moduleCode] || [];

  if (!userPermissions.includes(permissionKey)) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: `Forbidden. You do not have permission to ${permissionKey} on ${moduleCode}.` },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    payload,
  };
}
