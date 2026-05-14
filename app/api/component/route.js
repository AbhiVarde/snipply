import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export async function POST(req) {
  try {
    const { code, title, author_id, forked_from } = await req.json();

    if (!code || !author_id) {
      return NextResponse.json(
        { error: "Missing code or author_id" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("components")
      .insert({
        code,
        title: title || "Untitled",
        author_id,
        forked_from: forked_from || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("Server error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
