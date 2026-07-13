# Secure Signup via Security Key Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai cơ chế bảo mật đăng ký tài khoản chỉ cho phép đăng ký khi nhập đúng mã bảo mật cấu hình trong môi trường server Next.js. Người dùng đăng ký hợp lệ sẽ được tự động kích hoạt tài khoản và đăng nhập thẳng vào workspace.

**Architecture:**
- Tạo API Route `/api/auth/register` (POST) để xác thực mã bảo mật và đăng ký tài khoản thông qua Supabase Admin API.
- Cập nhật Form Đăng ký tại [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/page.tsx) để bổ sung trường nhập mã bảo mật khi ở tab "Đăng ký" và chuyển hướng submit qua API Route mới.
- Tự động đăng nhập người dùng ngay sau khi đăng ký thành công.

**Tech Stack:** Next.js Server API, Supabase Admin API

## Global Constraints

- Không chứa lỗi cú pháp TypeScript.
- Bảo đảm hot reload trong Docker hoạt động trơn tru.

---

### Task 1: Xây dựng API Route đăng ký bảo mật /api/auth/register

**Files:**
- [NEW] `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Tạo tệp route.ts và viết mã nguồn xử lý POST request**

Tạo tệp tại [route.ts](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/api/auth/register/route.ts):

- Lấy `email`, `password`, `securityKey` từ request body.
- So khớp `securityKey` với `process.env.REGISTRATION_SECURITY_KEY`.
- Sử dụng `process.env.SUPABASE_SERVICE_ROLE_KEY` và `NEXT_PUBLIC_SUPABASE_URL` để khởi tạo Supabase Client Admin.
- Gọi `auth.admin.createUser` với `email_confirm: true`.
- Báo lỗi nếu mã bảo mật hoặc Supabase trả về lỗi.

- [ ] **Step 2: Commit API Route**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat: implement Next.js API route for secure registration with security key"
```

---

### Task 2: Cập nhật Form Đăng ký trên trang chủ

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Định nghĩa state securityKey**

Thêm `const [securityKey, setSecurityKey] = useState("");` vào component.

- [ ] **Step 2: Cập nhật hàm handleAuth để gọi API Route khi ở chế độ Đăng ký**

Khi đăng ký, gọi `/api/auth/register` bằng `fetch`, sau đó tự động gọi `signInWithPassword` nếu thành công:

```typescript
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
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
```

- [ ] **Step 3: Thêm Input cho Mã bảo mật trong JSX**

Hiển thị input Mã đăng ký bảo mật khi `authMode === "signup"`.

- [ ] **Step 4: Chạy kiểm tra lint, build và tests để xác minh**

```powershell
npm run lint
npm run build
npm run test
```

- [ ] **Step 5: Commit và push toàn bộ thay đổi**

```bash
git add src/app/page.tsx
git commit -m "feat: update signup UI with security key field and connect to register API"
git push
```
