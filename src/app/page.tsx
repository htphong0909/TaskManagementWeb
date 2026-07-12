"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // Listen to auth state
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setAuthSuccess("Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra trong quá trình xác thực.";
      setAuthError(errMsg);
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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

  if (user) {
    return (
      <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
        {/* Background Decorative Gradients */}
        <div className="absolute top-[20%] left-[20%] h-[350px] w-[350px] rounded-full bg-violet-300/30 blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-[20%] right-[20%] h-[350px] w-[350px] rounded-full bg-pink-300/30 blur-[80px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-2xl p-8 relative z-10 text-center">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
            Chào mừng trở lại,
          </h2>
          <p className="text-base font-semibold text-violet-600 mb-2 truncate">
            {user.email}
          </p>
          <p className="text-sm text-slate-500 mb-8">
            Hệ thống quản lý công việc của bạn đang được thiết lập. Hãy quay lại sau!
          </p>
          <button
            onClick={handleSignOut}
            className="rounded-xl border border-slate-200 hover:bg-slate-50 px-6 py-2.5 text-xs font-semibold text-slate-600 transition cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
      {/* Background Decorative Gradients */}
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
