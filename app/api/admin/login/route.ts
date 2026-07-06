import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkPassphrase,
  createSessionToken,
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
} from "@/lib/adminAuth";

const bodySchema = z.object({ passphrase: z.string().min(1) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !checkPassphrase(parsed.data.passphrase)) {
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createSessionToken(),
    adminSessionCookieOptions
  );
  return response;
}
