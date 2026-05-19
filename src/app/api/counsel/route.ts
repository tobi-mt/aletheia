import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { many, run } from "@/lib/db";

type CounselRow = {
  id: string;
  name: string;
  role: string;
  notes: string | null;
  created_at: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ contacts: [] });
  }

  const contacts = await many<CounselRow>(
    `SELECT id, name, role, notes, created_at
     FROM counsel_contacts
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    user.id
  );

  return NextResponse.json({
    contacts: contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      role: contact.role,
      notes: contact.notes,
      createdAt: contact.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to save your counsel circle." }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string; role?: string; notes?: string };
  const name = body.name?.trim();
  const role = body.role?.trim() || "mentor";
  const notes = body.notes?.trim() || null;
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const contact = {
    id: crypto.randomUUID(),
    name,
    role,
    notes,
    createdAt: now,
  };
  await run(
    `INSERT INTO counsel_contacts (id, user_id, name, role, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    contact.id,
    user.id,
    name,
    role,
    notes,
    now,
    now
  );
  await trackServerEvent({
    userId: user.id,
    eventName: "counsel_contact_created",
    metadata: { role },
  });

  return NextResponse.json({ contact });
}
