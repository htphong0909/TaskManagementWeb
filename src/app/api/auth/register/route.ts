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

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Cấu hình Supabase trên Server chưa đầy đủ!" },
        { status: 500 }
      );
    }

    // Khởi tạo Supabase Client Admin bằng Service Role Key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Tạo tài khoản và tự động kích hoạt email xác nhận
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    console.error("Lỗi đăng ký tài khoản:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi hệ thống" },
      { status: 500 }
    );
  }
}
