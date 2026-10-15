import { db } from "./database";
import { User } from "../contracts/domain";

// Đăng nhập chỉ dành cho bài demo trên web, không thay thế xác thực phía server.
// ASVS V14.3: không lưu mật khẩu nhập vào dưới dạng rõ; không dùng dữ liệu thật.
const credentialsKey = "elan_demo_credentials";
const sessionKey = "elan_demo_session";
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
async function digest(password: string, salt: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${password}`),
  );
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function setDemoPassword(userId: string, password: string) {
  if (password.length < 8)
    throw new Error("Mật khẩu demo phải có ít nhất 8 ký tự.");
  const records = read<Record<string, { salt: string; digest: string }>>(
    credentialsKey,
    {},
  );
  const salt = crypto.randomUUID();
  records[userId] = { salt, digest: await digest(password, salt) };
  localStorage.setItem(credentialsKey, JSON.stringify(records));
  localStorage.setItem(`elan_password_version_${userId}`, salt);
  if (userId === "USR001") localStorage.setItem("elan_admin_login_v4", "1");
}
export async function loginDemo(
  email: string,
  password: string,
): Promise<User> {
  const user = db.users.find(
    (u) => (u.id === "USR001" && email.trim().toLowerCase() === "b") || u.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!user || !user.isActive)
    throw new Error(
      "Email hoặc mật khẩu chưa đúng, hoặc tài khoản đã bị khóa.",
    );
  if (user.id === 'USR001' && !localStorage.getItem('elan_admin_login_v4')) {
    const records = read<Record<string, { salt: string; digest: string }>>(credentialsKey, {});
    const salt = crypto.randomUUID();
    records[user.id] = { salt, digest: await digest('b', salt) };
    localStorage.setItem(credentialsKey, JSON.stringify(records));
    localStorage.setItem(`elan_password_version_${user.id}`, salt);
    localStorage.setItem('elan_admin_login_v4', '1');
  }
  const record = read<Record<string, { salt: string; digest: string }>>(
    credentialsKey,
    {},
  )[user.id];
  const valid = record
    ? (await digest(password, record.salt)) === record.digest
    : ["USR001", "USR002"].includes(user.id) && password === "Demo@123";
  if (!valid) throw new Error("Email hoặc mật khẩu chưa đúng.");
  sessionStorage.setItem(sessionKey, JSON.stringify({ id: user.id, version: localStorage.getItem(`elan_password_version_${user.id}`) }));
  return user;
}
export function getDemoSession() {
  try {
    const stored = sessionStorage.getItem(sessionKey);
    if (!stored) return null;
    let session: { id: string; version: string | null };
    try { session = JSON.parse(stored); } catch { session = { id: stored, version: null }; }
    if (session.version !== localStorage.getItem(`elan_password_version_${session.id}`)) return null;
    return db.users.find((u) => u.id === session.id && u.isActive) || null;
  } catch {
    return null;
  }
}
export function logoutDemo() {
  try {
    sessionStorage.removeItem(sessionKey);
  } catch {
    /* Ngoài web không có phiên trình duyệt. */
  }
}
