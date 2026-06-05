import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-jwt-secret-key-must-be-long-and-secure-12345"
);

interface TokenPayload {
  userId: string;
  name: string;
  email: string;
  permissions: Record<string, string[]>;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore static assets, images, favicon, api/auth routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  let accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  let payload: TokenPayload | null = null;

  // Verify access token if present
  if (accessToken) {
    try {
      const { payload: jwtPayload } = await jwtVerify(accessToken, JWT_SECRET);
      payload = jwtPayload as unknown as TokenPayload;
    } catch (e) {
      accessToken = undefined; // Token expired or invalid
    }
  }

  // Attempt to refresh if access token is invalid but refresh token is present
  if (!accessToken && refreshToken) {
    try {
      const refreshRes = await fetch(new URL("/api/auth/refresh", request.url).toString(), {
        method: "POST",
        headers: {
          Cookie: `refresh_token=${refreshToken}`,
        },
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        
        // Clone headers to continue
        const response = NextResponse.next();
        
        // Extract set-cookie headers from refresh API response
        const cookies = refreshRes.headers.getSetCookie();
        for (const cookieStr of cookies) {
          response.headers.append("Set-Cookie", cookieStr);
        }

        // To make sure the current request path has cookies in it, extract new access token
        // and decode it for route permission checks in the middleware
        const newAccessToken = cookies
          .find((c) => c.startsWith("access_token="))
          ?.split(";")[0]
          ?.split("=")[1];

        if (newAccessToken) {
          try {
            const { payload: newJwtPayload } = await jwtVerify(newAccessToken, JWT_SECRET);
            payload = newJwtPayload as unknown as TokenPayload;
            accessToken = newAccessToken;
          } catch (e) {}
        }

        // Continue request with new cookies set on the response
        if (pathname === "/login") {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        // Run RBAC route permission guards
        if (payload) {
          const rbacResponse = checkPathPermissions(pathname, payload, request);
          if (rbacResponse) {
            // Apply cookies to redirect response too
            for (const cookieStr of cookies) {
              rbacResponse.headers.append("Set-Cookie", cookieStr);
            }
            return rbacResponse;
          }
        }

        return response;
      }
    } catch (error) {
      console.error("Middleware refresh token error:", error);
    }
  }

  // Handle routing redirects
  if (!accessToken) {
    // Redirect to login if accessing dashboard page
    if (pathname !== "/login") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // User is authenticated
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Run RBAC route permission guards for normal authenticated requests
  if (payload) {
    const rbacResponse = checkPathPermissions(pathname, payload, request);
    if (rbacResponse) return rbacResponse;
  }

  return NextResponse.next();
}

/**
 * Checks module view permissions for the request pathname.
 */
function checkPathPermissions(pathname: string, payload: TokenPayload, request: NextRequest) {
  const permissions = payload.permissions || {};

  if (pathname.startsWith("/users")) {
    const userPerms = permissions["users"] || [];
    if (!userPerms.includes("view")) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }
  }

  if (pathname.startsWith("/staff")) {
    const staffPerms = permissions["staff"] || [];
    if (!staffPerms.includes("view")) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }
  }

  if (pathname.startsWith("/roles")) {
    const rolePerms = permissions["roles"] || [];
    if (!rolePerms.includes("view")) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }
  }

  if (pathname.startsWith("/permissions")) {
    const permPerms = permissions["permissions"] || [];
    if (!permPerms.includes("view")) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }
  }

  if (pathname.startsWith("/modules")) {
    const modPerms = permissions["modules"] || [];
    if (!modPerms.includes("view")) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }
  }

  return null;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (except api/auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
