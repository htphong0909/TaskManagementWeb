import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { email, password, securityKey } = await request.json();
    const correctKey = process.env.REGISTRATION_SECURITY_KEY;

    if (!correctKey || securityKey !== correctKey) {
      return NextResponse.json(
        { error: "Mã đăng ký bảo mật không chính xác!" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      console.warn("NEXT_PUBLIC_SUPABASE_URL is missing. Running in Auth Mock Mode.");
      return NextResponse.json({
        success: true,
        user: { id: "mock-user-uuid-123456", email },
        message: "Chế độ MOCK: Tạo tài khoản thành công"
      });
    }

    if (supabaseServiceKey) {
      // 1. Quyền Admin: Tạo user confirm sẵn
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, user: data.user });
    } else if (supabaseAnonKey) {
      // 2. Quyền User công khai (Fall back khi thiếu Service Role Key): 
      // Gọi signUp công khai trên Server
      console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to public signUp API.");
      const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data, error } = await supabasePublic.auth.signUp({
        email,
        password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, user: data.user });
    } else {
      // 3. Thiếu cả Service Key lẫn Anon Key
      console.warn("No Supabase credentials found on Server. Running in Auth Mock Mode.");
      return NextResponse.json({
        success: true,
        user: { id: "mock-user-uuid-123456", email },
        message: "Chế độ MOCK: Tạo tài khoản thành công"
      });
    }
  } catch (error: unknown) {
    console.error("Lỗi đăng ký tài khoản:", error);
    const message = error instanceof Error ? error.message : "Đã xảy ra lỗi hệ thống";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
