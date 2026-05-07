import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import store from "@/lib/store";

export async function POST(req) {
  const { code } = await req.json();
  const id = randomUUID();
  store.set(id, code);
  return NextResponse.json({ id });
}
