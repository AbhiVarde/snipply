import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createRequestClient(req) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: req.headers.get("authorization") ?? "",
        },
      },
    },
  );
}

export async function POST(req) {
  try {
    const supabase = createRequestClient(req);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const { code, title, forked_from } = await req.json();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!code) {
      return NextResponse.json(
        { error: "Missing code" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("components")
      .insert({
        code,
        title: title || "Untitled",
        author_id: authData.user.id,
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
