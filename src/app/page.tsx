"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityKey, setSecurityKey] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Điều hướng khi đã đăng nhập
  useEffect(() => {
    if (user && !authLoading) {
      const handleRedirect = async () => {
        try {
          // Lấy danh sách boards
          const { data: boards, error } = await supabase
            .from("boards")
            .select("id")
            .order("created_at", { ascending: true });

          if (error) throw error;

          if (boards && boards.length > 0) {
            router.push(`/board/${boards[0].id}`);
          } else {
            // Chưa có board nào -> Tạo board mặc định đầu tiên
            const { data: newBoard, error: createError } = await supabase
              .from("boards")
              .insert([{ title: "Bảng đầu tiên", user_id: user.id }])
              .select("id")
              .single();

            if (createError) throw createError;
            if (newBoard) {
              router.push(`/board/${newBoard.id}`);
            }
          }
        } catch (err) {
          console.error("Lỗi điều hướng hoặc tạo Board mặc định:", err);
        }
      };
      handleRedirect();
    }
  }, [user, authLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setSubmittingAuth(true);

    if (!email || !password) {
      setAuthError("Vui lòng điền đầy đủ email và mật khẩu.");
      setSubmittingAuth(false);
      return;
    }

    try {
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        if (!securityKey) {
          throw new Error("Vui lòng nhập mã đăng ký bảo mật.");
        }
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, securityKey }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Đăng ký thất bại");
        }

        // Tự động đăng nhập
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra trong quá trình xác thực.";
      setAuthError(errMsg);
    } finally {
      setSubmittingAuth(false);
    }
  };

  if (authLoading) {
    return (
      <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Đang khởi động hệ thống...</p>
        </div>
      </div>
    );
  }

  // Nếu user đã đăng nhập, hiển thị màn hình chờ điều hướng
  if (user) {
    return (
      <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Đang chuyển tới không gian làm việc...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
      <div className="absolute top-[20%] left-[20%] h-[350px] w-[350px] rounded-full bg-violet-300/30 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[20%] h-[350px] w-[350px] rounded-full bg-pink-300/30 blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-2xl p-8 relative z-10 transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 shadow-md shadow-violet-500/10 mb-4">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            {authMode === "signin" ? "Đăng nhập Webapp" : "Đăng ký tài khoản"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {authMode === "signin" ? "Chào mừng trở lại ứng dụng của bạn" : "Tạo tài khoản sử dụng riêng"}
          </p>
        </div>

        {authError && (
          <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-200 p-4 text-xs font-medium text-rose-600">
            {authError}
          </div>
        )}

        {authSuccess && (
          <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-200 p-4 text-xs font-medium text-emerald-600">
            {authSuccess}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-200/40 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-200/40 focus:bg-white"
              required
            />
          </div>

          {authMode === "signup" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Mã đăng ký bảo mật</label>
              <input
                type="password"
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value)}
                placeholder="Nhập mã bảo mật để đăng ký"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-200/40 focus:bg-white"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submittingAuth}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/15 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
          >
            {submittingAuth ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : null}
            {authMode === "signin" ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-200/60 pt-6">
          <button
            onClick={() => {
              setAuthMode(authMode === "signin" ? "signup" : "signin");
              setAuthError("");
              setAuthSuccess("");
            }}
            className="text-xs font-medium text-slate-500 hover:text-violet-600 transition cursor-pointer"
          >
            {authMode === "signin" ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
          </button>
        </div>
      </div>
    </div>
  );
}
