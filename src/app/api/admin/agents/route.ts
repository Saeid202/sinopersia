import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "دسترسی غیرمجاز است." }, { status: 403 });

  const body = await request.json() as { name?: string; email?: string; password?: string };
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password || "";
  if (!name || !email || password.length < 6) {
    return NextResponse.json({ error: "نام، ایمیل و رمز عبور حداقل ۶ کاراکتری لازم است." }, { status: 400 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY در تنظیمات سرور ثبت نشده است." }, { status: 500 });
  }

  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || "ایجاد حساب ایجنت انجام نشد." }, { status: 400 });
  }

  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: created.user.id,
    email,
    full_name: name,
    role: "agent",
  });
  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "حساب ساخته شد اما پروفایل ایجنت ایجاد نشد: " + profileError.message }, { status: 500 });
  }

  return NextResponse.json({ id: created.user.id, email, name });
}
