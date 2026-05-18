import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { one, run } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    name?: string;
    password?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !email.includes("@") || password.length < 8) {
    return NextResponse.json(
      { error: "Use a valid email and a password of at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await one("SELECT id FROM users WHERE email = ?", email);
  if (existing) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    name: body.name?.trim() || null,
  };

  await run(
    "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    user.id,
    user.email,
    user.name,
    hashPassword(password),
    new Date().toISOString()
  );

  await createSession(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}
