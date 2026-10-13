// Local fallback auth for quick testing (browser storage only, NOT secure).
// To go live, swap these functions for Supabase: auth.signUp / signInWithPassword, and
// `profiles` + `messages` tables keyed by user id. Profile and chat are stored separately,
// so editing the profile never touches chat history.
import type { Msg, UserProfile } from "./types";

const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? "") as T; } catch { return d; } };
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");

type Users = Record<string, { id: string; hash: string }>;

export async function signUp(email: string, pw: string) {
  const users = read<Users>("kx.users", {}); const e = email.trim().toLowerCase();
  if (users[e]) throw new Error("That email already has an account. Log in instead.");
  users[e] = { id: crypto.randomUUID(), hash: await sha(pw + e) }; write("kx.users", users);
  write("kx.session", users[e].id); return users[e].id;
}
export async function signIn(email: string, pw: string) {
  const e = email.trim().toLowerCase(); const u = read<Users>("kx.users", {})[e];
  if (!u || u.hash !== (await sha(pw + e))) throw new Error("Email or password is wrong.");
  write("kx.session", u.id); return u.id;
}
export const signOut = () => localStorage.removeItem("kx.session");
export const getSession = () => read<string | null>("kx.session", null);
export const getProfile = (id: string) => read<UserProfile | null>(`kx.profile.${id}`, null);
export const saveProfile = (id: string, p: UserProfile) => write(`kx.profile.${id}`, p);
export const getChat = (id: string) => read<Msg[]>(`kx.chat.${id}`, []);
export const saveChat = (id: string, m: Msg[]) => write(`kx.chat.${id}`, m.slice(-100));
