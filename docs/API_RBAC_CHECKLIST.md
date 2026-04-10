# Checklist: API có RBAC (FinRecruit)

Dùng checklist này khi thêm route mới trong `src/app/(backend)/api/` để tránh 401/403 không mong đợi và giữ hành vi thống nhất.

## Kiến trúc ngắn gọn

- **Bảo vệ API** không đi qua `[src/middleware.ts](../src/middleware.ts)`: matcher cho phép mọi request `/api/*` đi tiếp; **quyền được kiểm tra trong từng Route Handler** (cookie app session + MongoDB).
- **Phân quyền theo role** dùng helper `[src/app/(backend)/middleware/auth&RBAC.ts](../src/app/(backend)`/middleware/auth&RBAC.ts):
  - `withRBAC(requiredRoles, handler)` — cần đúng một trong các role (hoặc mảng role).
  - `requireAuthenticatedSession` — chỉ cần đăng nhập (bất kỳ role).

Cookie HTTP-only `**finrecruit_session`** được set khi đăng nhập Google thành công (xem `[libs/session.ts](../src/app/(backend)`/libs/session.ts)). RBAC đọc session này, **không** thay bằng chỉ JWT NextAuth trên API.

---

## Checklist khi tạo API mới

### 1. Runtime

- Thêm `export const runtime = 'nodejs';` nếu route cần MongoDB / `cookies()` / logic nặng (khuyến nghị giống các route hiện có).

### 2. Import và bọc handler

- Import `withRBAC` từ `@/app/(backend)/middleware/auth&RBAC` (đúng ký tự `&` trong tên file).
- Bọc handler:  
`export const GET = withRBAC('Executive Board', async (req, context) => { ... });`  
hoặc nhiều role:  
`withRBAC(['Department Head', 'Executive Board'], ...)`.
- Kiểu `context`: dùng `{ session: ActiveAppSession }` khi cần `context.session` (xem `[api/executive/ping/route.ts](../src/app/(backend)`/api/executive/ping/route.ts)).

### 3. Method HTTP

- Export đúng method: `GET`, `POST`, `PATCH`, `DELETE`, … — mỗi method cần bọc riêng nếu đều cần RBAC.

### 4. Gọi API từ trình duyệt / frontend

- Gọi **cùng origin** và gửi cookie: `fetch('/api/...', { credentials: 'include', ... })`.
- User phải **đã đăng nhập** (có cookie `finrecruit_session`). Đăng nhập lại nếu vừa đổi role trong DB.

### 5. Gọi API từ curl / Postman

- Copy giá trị cookie `finrecruit_session` từ DevTools → Application → Cookies (local dev tên cookie: `finrecruit_session`).
- Gửi header: `Cookie: finrecruit_session=<giá_trị>`.

### 6. Test quyền

- **401** — không có session / session hết hạn / cookie thiếu → `requireAuthenticatedSession`.
- **403** — đã đăng nhập nhưng role không nằm trong danh sách cho phép → `checkRole`.
- Test với user **Executive Board** (và một user **Guest** hoặc **Department Head**) để chắc chắn 403 khi đúng kịch bản.

### 7. Dữ liệu nhạy cảm

- Không trả lỗi chi tiết làm lộ cấu trúc DB nếu không cần.
- Endpoint ví dụ `/api/executive/ping` có thể trả `email` để debug — endpoint production nên thu gọn payload.

### 8. Tham chiếu

- API mẫu Executive-only: `[src/app/(backend)/api/executive/ping/route.ts](../src/app/(backend)`/api/executive/ping/route.ts).
- API đổi role user (cũng Executive-only): `[src/app/(backend)/api/users/role/route.ts](../src/app/(backend)`/api/users/role/route.ts).

---

## `RoleType` hợp lệ

Theo `[src/app/(backend)/types/index.d.ts](../src/app/(backend)`/types/index.d.ts):

- `Guest`
- `Department Head`
- `Executive Board`

Chuỗi role trong `withRBAC` phải **khớp chính xác** (có khoảng trắng, ví dụ `Executive Board`).

---

## Lỗi thường gặp


| Triệu chứng                        | Hướng xử lý                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| Luôn 401 từ browser                | Thiếu `credentials: 'include'` hoặc chưa đăng nhập / cookie hết hạn.           |
| 401 sau khi sửa role trong MongoDB | Đăng xuất và đăng nhập lại; đảm bảo app session còn hợp lệ.                    |
| 403 dù “đã là Executive”           | Role trong DB chưa khớp chuỗi `Executive Board`; hoặc đang gọi bằng user khác. |
| Import lỗi `auth&RBAC`             | Đường dẫn phải có `&`: `middleware/auth&RBAC`.                                 |


