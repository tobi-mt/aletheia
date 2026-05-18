import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { one } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await one<{
    id: string;
    email: string;
    name: string | null;
    password_hash: string;
  }>("SELECT id, email, name, password_hash FROM users WHERE email = ?", email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}
