import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, getUserPermissions, signAccessToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAccessToken(accessToken);

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissions = await getUserPermissions(payload.userId);

    const newAccessToken = await signAccessToken({
      userId: payload.userId,
      name: payload.name,
      email: payload.email,
      permissions,
    });

    const response = NextResponse.json({
      user: {
        id: payload.userId,
        name: payload.name,
        email: payload.email,
      },
      permissions,
    });

    response.cookies.set("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    return response;
  } catch (error: any) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
