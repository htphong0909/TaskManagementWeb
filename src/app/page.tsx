"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Task {
  id: string;
  title: string;
  content: string | null;
  is_completed: boolean;
  created_at: string;
  user_id: string;
}

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

  // App state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskContent, setTaskContent] = useState("");
  const [taskError, setTaskError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

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

  // Fetch tasks when user is available
  useEffect(() => {
    if (user) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [user]);

  const fetchTasks = async () => {
    setTasksLoading(true);
    setTaskError("");
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err: any) {
      setTaskError(err.message || "Không thể tải danh sách công việc.");
    } finally {
      setTasksLoading(false);
    }
  };

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
        setAuthSuccess("Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản (nếu bạn bật xác thực email trên Supabase).");
      }
    } catch (err: any) {
      setAuthError(err.message || "Có lỗi xảy ra trong quá trình xác thực.");
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError("");

    if (!taskTitle.trim()) {
      setTaskError("Vui lòng nhập tiêu đề công việc.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            title: taskTitle.trim(),
            content: taskContent.trim() || null,
            user_id: user?.id,
          },
        ])
        .select();

      if (error) throw error;

      if (data) {
        setTasks([data[0], ...tasks]);
        setTaskTitle("");
        setTaskContent("");
      }
    } catch (err: any) {
      setTaskError(err.message || "Không thể thêm công việc mới.");
    }
  };

  const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: !currentStatus })
        .eq("id", taskId);

      if (error) throw error;

      setTasks(
        tasks.map((t) => (t.id === taskId ? { ...t, is_completed: !currentStatus } : t))
      );
    } catch (err: any) {
      setTaskError(err.message || "Không thể cập nhật trạng thái.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa công việc này?")) return;

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err: any) {
      setTaskError(err.message || "Không thể xóa công việc.");
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "pending") return !t.is_completed;
    if (filter === "completed") return t.is_completed;
    return true;
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-400">Đang khởi động hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100 selection:bg-violet-500 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      {/* Main Content Area */}
      <main className="container mx-auto max-w-4xl px-4 py-12 md:py-20 z-10 relative">
        {!user ? (
          /* AUTHENTICATION VIEW */
          <div className="flex justify-center items-center py-8">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl transition-all duration-300">
              <div className="flex flex-col items-center mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-600/30 mb-4">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {authMode === "signin" ? "Đăng nhập Webapp" : "Đăng ký tài khoản"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {authMode === "signin" ? "Chào mừng trở lại ứng dụng của bạn" : "Tạo tài khoản sử dụng riêng cho 1-2 người"}
                </p>
              </div>

              {authError && (
                <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">
                  {authSuccess}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition duration-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Mật khẩu</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition duration-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAuth}
                  className="w-full rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition duration-200 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98] disabled:opacity-50"
                >
                  {submittingAuth ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Đang xử lý...
                    </span>
                  ) : authMode === "signin" ? (
                    "Đăng nhập"
                  ) : (
                    "Đăng ký"
                  )}
                </button>
              </form>

              <div className="mt-8 text-center border-t border-slate-800 pt-6">
                <button
                  onClick={() => {
                    setAuthMode(authMode === "signin" ? "signup" : "signin");
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className="text-xs font-medium text-slate-400 hover:text-violet-400 transition"
                >
                  {authMode === "signin"
                    ? "Chưa có tài khoản? Đăng ký ngay"
                    : "Đã có tài khoản? Quay lại đăng nhập"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MAIN WEBAPP DASHBOARD */
          <div className="space-y-8 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Trình quản lý công việc</h1>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-medium text-slate-400 hover:border-rose-500/30 hover:text-rose-400 transition duration-200 active:scale-[0.98]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Đăng xuất
              </button>
            </div>

            {/* Error notifications */}
            {taskError && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
                {taskError}
              </div>
            )}

            {/* Create task card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
              <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-violet-500"></span> Thêm công việc mới
              </h2>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Tiêu đề công việc..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition duration-200 focus:border-violet-500"
                    required
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Mô tả chi tiết (tùy chọn)..."
                    value={taskContent}
                    onChange={(e) => setTaskContent(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition duration-200 focus:border-violet-500 resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/25 transition duration-200 hover:bg-violet-500 active:scale-[0.98]"
                  >
                    Tạo công việc
                  </button>
                </div>
              </form>
            </div>

            {/* Filter & Task list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">Danh sách công việc</h3>
                
                {/* Filters */}
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setFilter("all")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      filter === "all" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setFilter("pending")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      filter === "pending" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Đang làm
                  </button>
                  <button
                    onClick={() => setFilter("completed")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      filter === "completed" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Hoàn thành
                  </button>
                </div>
              </div>

              {/* Tasks list */}
              {tasksLoading ? (
                <div className="flex py-12 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/10">
                  <svg className="h-10 w-10 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2m15 5h-3m-6 0H6M9 16v4m0 0h6m-6 0H6" />
                  </svg>
                  <p className="text-sm font-medium text-slate-500">
                    {filter === "all"
                      ? "Chưa có công việc nào. Hãy thêm công việc mới phía trên!"
                      : filter === "pending"
                      ? "Không có công việc nào đang chờ thực hiện."
                      : "Chưa có công việc nào hoàn thành."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`group flex items-start justify-between rounded-xl border border-slate-800 bg-slate-900/30 p-5 backdrop-blur-sm transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/50 ${
                        task.is_completed ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start gap-4 pr-4">
                        <button
                          onClick={() => handleToggleComplete(task.id, task.is_completed)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                            task.is_completed
                              ? "bg-violet-600 border-violet-600 text-white"
                              : "border-slate-700 hover:border-violet-500 bg-slate-950"
                          }`}
                        >
                          {task.is_completed && (
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        
                        <div className="space-y-1">
                          <h4
                            className={`text-sm font-medium tracking-tight transition-all duration-200 ${
                              task.is_completed ? "line-through text-slate-500" : "text-white"
                            }`}
                          >
                            {task.title}
                          </h4>
                          {task.content && (
                            <p className={`text-xs text-slate-400 whitespace-pre-wrap ${
                              task.is_completed ? "line-through text-slate-600" : ""
                            }`}>
                              {task.content}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 shrink-0"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
