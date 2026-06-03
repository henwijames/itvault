import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  getUserPermissions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token missing" }, { status: 401 });
    }

    // Verify token payload
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    // Verify DB entry
    const dbToken = await prisma.refresh_tokens.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!dbToken || dbToken.expires_at < new Date() || dbToken.user.status !== "ACTIVE") {
      // Clean up invalid/expired token if it exists
      if (dbToken) {
        await prisma.refresh_tokens.delete({ where: { id: dbToken.id } });
      }
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const user = dbToken.user;
    const permissions = await getUserPermissions(user.id);

    // Generate new tokens (rotation)
    const newAccessToken = await signAccessToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      permissions,
    });

    const newRefreshToken = await signRefreshToken(user.id);

    // Update refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.$transaction([
      prisma.refresh_tokens.delete({ where: { id: dbToken.id } }),
      prisma.refresh_tokens.create({
        data: {
          user_id: user.id,
          token: newRefreshToken,
          expires_at: expiresAt,
        },
      }),
    ]);

    // Set updated cookies
    const response = NextResponse.json({ success: true });

    response.cookies.set("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    response.cookies.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
