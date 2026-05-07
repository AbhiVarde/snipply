import { NextResponse } from "next/server";
import store from "@/lib/store";

export async function GET(_, { params }) {
  const code = store.get(params.id);
  if (!code) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ code });
}

export async function PUT(req, { params }) {
  const { code } = await req.json();
  store.set(params.id, code);
  return NextResponse.json({ ok: true });
}
