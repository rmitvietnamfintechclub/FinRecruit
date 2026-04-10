# Quy ước đặt tên nhánh và commit (FinRecruit)

Tài liệu này bổ sung cho [GIT_BASICS.md](./GIT_BASICS.md): cách đặt **tên nhánh** và **message commit** cho đồng bộ trong team và dễ đọc lịch sử.

---

## 1. Đặt tên nhánh (branch)

### Nguyên tắc chung

- Dùng **chữ thường**, từ nối bằng **dấu gạch ngang** `-` (không dùng khoảng trắng).
- Cấu trúc gợi ý: `<loại>/<mô-tả-ngắn>`
- `mô-tả-ngắn`: tiếng Anh **hoặc** telex không dấu, 2–5 từ khóa, nói rõ task (đủ để phân biệt PR).

### Tiền tố `loại` hay dùng

| Tiền tố | Khi nào dùng | Ví dụ |
|---------|----------------|--------|
| `feature/` | Tính năng mới | `feature/waiting-room-ui` |
| `fix/` | Sửa lỗi (bug) | `fix/login-redirect-loop` |
| `chore/` | Việc lặt vặt: cấu hình, dependency, format | `chore/eslint-config` |
| `docs/` | Chỉ sửa tài liệu | `docs/git-basics-guide` |
| `refactor/` | Đổi cấu trúc code, không đổi hành vi | `refactor/session-helpers` |
| `test/` | Thêm/sửa test | `test/api-role-route` |

### Ví dụ hợp lệ

```text
feature/executive-dashboard-shell
fix/middleware-guest-redirect
docs/api-rbac-checklist
chore/bump-next-patch
```

### Tránh

- Tên quá chung: `feature/update`, `fix/bug` (không biết sửa gì).
- Khoảng trắng, chữ hoa lung tung: `Feature/My Branch`.
- Tên quá dài cả câu — nên rút gọn còn ý chính.

---

## 2. Message commit

### Quy ước gợi ý: Conventional Commits (rút gọn)

Một dòng đầu (subject) theo mẫu:

```text
<loại>(<phạm vi tùy chọn>): <mô tả ngắn>
```

- **`loại`**: bắt buộc — một trong các giá trị dưới đây.
- **`phạm vi`**: tùy chọn — module hoặc khu vực (vd. `auth`, `api`, `frontend`).
- **`mô tả`**: dùng **lệnh**, không kết thúc bằng dấu chấm; tiếng Anh hoặc tiếng Việt nhưng **thống nhất trong cùng một PR** nếu có thể.

### Bảng `loại` (type)

| Loại | Ý nghĩa |
|------|---------|
| `feat` | Tính năng mới (user-facing) |
| `fix` | Sửa bug |
| `docs` | Chỉ tài liệu |
| `style` | Format, CSS, không đổi logic |
| `refactor` | Refactor, không đổi hành vi |
| `test` | Thêm/sửa test |
| `chore` | Build, tool, dependency, việc không vào release note |

### Ví dụ message một dòng

```text
feat(auth): add executive-only ping endpoint
fix(middleware): redirect inactive users to login
docs: add Git basics guide for newcomers
chore: update dependencies
refactor(session): extract cookie helpers
```

### Commit nhiều dòng (tùy chọn)

Khi cần giải thích thêm, để trống một dòng sau subject rồi viết body:

```text
fix(api): return 403 for wrong role on PATCH /users/role

Previously the handler could leak validation order; align with RBAC checks.
```

---

## 3. Gợi ý ghép nhánh + commit

| Công việc | Gợi ý tên nhánh | Gợi ý commit đầu tiên |
|-----------|------------------|------------------------|
| Thêm trang chờ Guest | `feature/waiting-room-page` | `feat(frontend): add waiting room layout` |
| Sửa redirect login | `fix/login-session-redirect` | `fix(auth): correct callback after Google sign-in` |
| Viết doc Git | `docs/git-naming` | `docs: add branch and commit naming guide` |

---

## 4. Kiểm tra nhanh trước khi push

- [ ] Tên nhánh có tiền tố `feature/`, `fix/`, … và mô tả ngắn rõ ràng.
- [ ] Commit đầu dòng có `loại:` và mô tả đủ ý (không chỉ `update` / `fix`).
- [ ] Không commit nhầm file nhạy cảm; message không chứa password/token.

---

## Tham khảo

- [Conventional Commits](https://www.conventionalcommits.org/) (tiếng Anh)
- [GIT_BASICS.md](./GIT_BASICS.md) — luồng lệnh từ branch đến push
