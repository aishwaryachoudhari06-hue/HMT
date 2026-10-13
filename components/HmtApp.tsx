"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import * as A from "@/lib/auth";
import { DIETS, GENDERS, GOALS, INJURIES, LEVELS, type Msg, type UserProfile } from "@/lib/types";

const blank: UserProfile = { name: "", age: 22, gender: GENDERS[0], height: 175, weight: 70, targetWeight: 68, goal: GOALS[0], daysPerWeek: 4, sessionMinutes: 60, experienceLevel: LEVELS[0], injuries: [], diet: DIETS[0] };

function check(p: UserProfile) {
  if (!p.name.trim()) return "Add your name.";
  if (p.age < 13 || p.age > 100) return "Age must be between 13 and 100.";
  if (p.height < 100 || p.height > 250) return "Height must be 100–250 cm.";
  if (p.weight < 30 || p.weight > 300 || p.targetWeight < 30 || p.targetWeight > 300) return "Weights must be 30–300 kg.";
  if (p.daysPerWeek < 1 || p.daysPerWeek > 7) return "Pick 1–7 training days.";
  if (p.sessionMinutes < 15 || p.sessionMinutes > 180) return "Sessions must be 15–180 minutes.";
  return "";
}

const Num = ({ label, v, set, min, max }: { label: string; v: number; set: (n: number) => void; min: number; max: number }) => (
  <label className="f"><span>{label}</span><input type="number" min={min} max={max} value={v} onChange={(e) => set(Number(e.target.value))} required /></label>
);
const Sel = ({ label, v, set, opts }: { label: string; v: string; set: (s: string) => void; opts: readonly string[] }) => (
  <label className="f"><span>{label}</span><select value={v} onChange={(e) => set(e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>
);

function ProfileForm({ initial, submit, onSubmit, onCancel }: { initial: UserProfile; submit: string; onSubmit: (p: UserProfile) => void; onCancel?: () => void }) {
  const [p, setP] = useState(initial); const [err, setErr] = useState("");
  const up = <K extends keyof UserProfile>(k: K) => (v: UserProfile[K]) => setP((s) => ({ ...s, [k]: v }));
  const toggle = (i: string) => up("injuries")(p.injuries.includes(i) ? p.injuries.filter((x) => x !== i) : [...p.injuries, i]);
  const go = (e: FormEvent) => { e.preventDefault(); const m = check(p); setErr(m); if (!m) onSubmit({ ...p, name: p.name.trim() }); };
  return (
    <form onSubmit={go} className="form">
      <label className="f wide"><span>Name</span><input value={p.name} maxLength={40} onChange={(e) => up("name")(e.target.value)} required /></label>
      <Num label="Age" v={p.age} set={up("age")} min={13} max={100} />
      <Sel label="Gender" v={p.gender} set={up("gender")} opts={GENDERS} />
      <Num label="Height (cm)" v={p.height} set={up("height")} min={100} max={250} />
      <Num label="Weight (kg)" v={p.weight} set={up("weight")} min={30} max={300} />
      <Num label="Target weight (kg)" v={p.targetWeight} set={up("targetWeight")} min={30} max={300} />
      <Sel label="Experience" v={p.experienceLevel} set={up("experienceLevel")} opts={LEVELS} />
      <Sel label="Main goal" v={p.goal} set={up("goal")} opts={GOALS} />
      <Sel label="Diet" v={p.diet} set={up("diet")} opts={DIETS} />
      <Num label="Days per week" v={p.daysPerWeek} set={up("daysPerWeek")} min={1} max={7} />
      <Num label="Session length (min)" v={p.sessionMinutes} set={up("sessionMinutes")} min={15} max={180} />
      <fieldset className="wide"><legend>Injuries and health conditions</legend>
        <div className="chips">
          <button type="button" aria-pressed={!p.injuries.length} onClick={() => up("injuries")([])}>None</button>
          {INJURIES.map((i) => <button type="button" key={i} aria-pressed={p.injuries.includes(i)} onClick={() => toggle(i)}>{i}</button>)}
        </div>
      </fieldset>
      {err && <p role="alert" className="err wide">{err}</p>}
      <div className="row wide">{onCancel && <button type="button" className="ghost" onClick={onCancel}>Cancel</button>}<button className="primary">{submit}</button></div>
    </form>
  );
}

function Shell({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return <main className="shell"><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}{children}</main>;
}

function Auth({ onDone }: { onDone: (id: string) => void }) {
  const [mode, setMode] = useState<"in" | "up">("up"); const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  const go = async (e: FormEvent) => { e.preventDefault(); setErr(""); try { onDone(await (mode === "up" ? A.signUp : A.signIn)(email, pw)); } catch (x) { setErr((x as Error).message); } };
  return (
    <Shell title="HMT" sub="Help Me Trainer. More like a brother. A coach in your pocket that knows your body, goals and injuries.">
      <form onSubmit={go} className="form narrow">
        <label className="f wide"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label className="f wide"><span>Password (8+ characters)</span><input type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete={mode === "up" ? "new-password" : "current-password"} /></label>
        {err && <p role="alert" className="err wide">{err}</p>}
        <button className="primary wide">{mode === "up" ? "Create account" : "Log in"}</button>
        <button type="button" className="ghost wide" onClick={() => setMode(mode === "up" ? "in" : "up")}>{mode === "up" ? "I already have an account" : "Create a new account"}</button>
      </form>
    </Shell>
  );
}

const STARTERS = ["Build me today's workout", "Check my squat form cues", "What should I eat post-workout?"];

function Chat({ uid, profile, onEdit, onOut }: { uid: string; profile: UserProfile; onEdit: () => void; onOut: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => A.getChat(uid)); const [input, setInput] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { A.saveChat(uid, msgs); end.current?.scrollIntoView({ block: "end" }); }, [uid, msgs, busy]);
  async function send(text: string) {
    const t = text.trim(); if (!t || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: t }]; setMsgs(next); setInput(""); setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, profile }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Request failed");
      setMsgs([...next, { role: "assistant", content: d.reply }]);
    } catch (x) { setMsgs(msgs); setInput(t); setErr((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="chat">
      <header>
        <div><strong className="logo">HMT</strong><span className="meta">{profile.name} · {profile.weight} → {profile.targetWeight} kg · {profile.daysPerWeek}x/week</span></div>
        <div className="row"><button className="ghost" onClick={onEdit}>Edit bio-profile</button><button className="ghost" onClick={onOut}>Log out</button></div>
        {profile.injuries.length > 0 && <ul className="flags" aria-label="Logged injuries">{profile.injuries.map((i) => <li key={i}>{i}</li>)}</ul>}
      </header>
      <section className="log" aria-live="polite">
        {!msgs.length && <div className="empty"><h2>Yo {profile.name}, what are we hitting?</h2><div className="chips">{STARTERS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div></div>}
        {msgs.map((m, i) => <p key={i} className={`bubble ${m.role}`}>{m.content}</p>)}
        {busy && <p className="bubble assistant dim">Locking in a reply…</p>}
        {err && <p role="alert" className="err">{err}</p>}
        <div ref={end} />
      </section>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input aria-label="Message your coach" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a lift, a swap, a meal…" maxLength={2000} />
        <button className="primary" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}

export default function HmtApp() {
  const [uid, setUid] = useState<string | null | undefined>(undefined); const [profile, setProfile] = useState<UserProfile | null>(null); const [editing, setEditing] = useState(false);
  useEffect(() => { const s = A.getSession(); setUid(s); if (s) setProfile(A.getProfile(s)); }, []);
  if (uid === undefined) return null;
  if (!uid) return <Auth onDone={(id) => { setUid(id); setProfile(A.getProfile(id)); }} />;
  const save = (p: UserProfile) => { A.saveProfile(uid, p); setProfile(p); setEditing(false); };
  if (!profile) return <Shell title="Set up your bio-profile" sub="Your coach uses this in every answer. You can change it any time."><ProfileForm initial={blank} submit="Start training" onSubmit={save} /></Shell>;
  return (
    <>
      <Chat uid={uid} profile={profile} onEdit={() => setEditing(true)} onOut={() => { A.signOut(); setUid(null); setProfile(null); }} />
      {editing && <div className="modal" role="dialog" aria-modal="true" aria-label="Edit bio-profile"><div><h2>Edit bio-profile</h2><p className="sub">Your chat history stays put.</p><ProfileForm initial={profile} submit="Save changes" onSubmit={save} onCancel={() => setEditing(false)} /></div></div>}
    </>
  );
}
