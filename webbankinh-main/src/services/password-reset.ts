import { db } from './database';
import { setDemoPassword } from './demoSession';

type Challenge = { email: string; userId?: string; code: string; expiresAt: number; attempts: number; consumed: boolean };
const key = 'elan_reset_challenges';
function load(): Record<string, Challenge> {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function save(challenges: Record<string, Challenge>) { localStorage.setItem(key, JSON.stringify(challenges)); }

// OTP is deliberately visible for the local demo, never an email/SMS delivery claim.
export function requestPasswordReset(emailInput: string, time = Date.now()) {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email không hợp lệ.');
  const challenges = load();
  if (Object.values(challenges).some(c => c.email === email && c.expiresAt - 5 * 60_000 + 60_000 > time))
    throw new Error('Hãy chờ 60 giây trước khi yêu cầu mã mới.');
  const challengeId = crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  const code = String(bytes[0] % 1_000_000).padStart(6, '0');
  const user = db.users.find(u => u.email.toLowerCase() === email && u.isActive);
  for (const c of Object.values(challenges)) if (c.email === email) c.consumed = true;
  challenges[challengeId] = { email, userId: user?.id, code, expiresAt: time + 5 * 60_000, attempts: 0, consumed: false };
  save(challenges);
  return { challengeId, demoCode: code, message: 'Nếu email có tài khoản, mã demo có thể dùng để đổi mật khẩu. Không gửi email thật.' };
}
export async function confirmPasswordReset(challengeId: string, code: string, password: string, time = Date.now()) {
  const challenges = load();
  const challenge = challenges[challengeId];
  if (!challenge || challenge.consumed || challenge.expiresAt <= time || challenge.attempts >= 5)
    throw new Error('Mã hết hạn, đã dùng hoặc vượt số lần thử. Hãy yêu cầu mã mới.');
  challenge.attempts++;
  save(challenges);
  if (challenge.code !== code.trim()) throw new Error('Mã OTP không đúng.');
  if (password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.');
  challenge.consumed = true;
  save(challenges);
  try {
    if (challenge.userId) await setDemoPassword(challenge.userId, password);
  } catch (error) {
    challenge.consumed = false;
    save(challenges);
    throw error;
  }
}
export async function adminResetPassword(actorId: string, employeeId: string, password: string) {
  const actor = db.users.find(u => u.id === actorId && u.isActive && u.role === 'admin');
  if (!actor) throw new Error('Chỉ quản trị viên được đặt lại mật khẩu.');
  const employee = db.employees.find(e => e.id === employeeId);
  if (!employee?.userId || !db.users.some(u => u.id === employee.userId)) throw new Error('Nhân viên chưa có tài khoản liên kết.');
  await setDemoPassword(employee.userId, password);
}
