import { NextResponse } from "next/server";
import { buildSystemPrompt, flagConflicts, sanitizeProfile } from "@/lib/prompt";

async function fetchWith503Retry(url: string, init: RequestInit) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, init);
    if (response.status !== 503 || attempt === 2) return response;
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw new Error("Request failed after retries");
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  if (!Array.isArray(body?.messages) || !body?.profile) return NextResponse.json({ error: "Missing messages or profile" }, { status: 400 });

  const profile = sanitizeProfile(body.profile);
  const messages = body.messages.slice(-20).map((m: any) => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: String(m?.content ?? "").slice(0, 4000),
  }));
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || !last.content.trim()) return NextResponse.json({ error: "Last message must be from the user" }, { status: 400 });

  const flagged = flagConflicts(profile, last.content);
  // Any OpenAI-compatible provider (Gemini, Groq, OpenRouter, Ollama) via LLM_*; Anthropic is optional.
  const base = process.env.LLM_BASE_URL;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!base && !anthropicKey) {
    const warn = flagged.length ? `⚠️ Hold up ${profile.name}: that move can clash with your ${flagged.join(" + ")}. Swap to a joint-friendly variation first.\n\n` : "";
    return NextResponse.json({ reply: `${warn}🔌 Demo mode: set LLM_BASE_URL, LLM_API_KEY and LLM_MODEL in .env.local for live coaching.` });
  }

  const system = buildSystemPrompt(profile, flagged);
  let reply = "";
  try {
    if (base) {
      const r = await fetchWith503Retry(`${base.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.LLM_API_KEY ?? ""}` },
        body: JSON.stringify({ model: process.env.LLM_MODEL, max_tokens: 700, messages: [{ role: "system", content: system }, ...messages] }),
      });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
      reply = (await r.json()).choices?.[0]?.message?.content ?? "";
    } else {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": anthropicKey!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6", max_tokens: 700, system, messages }),
      });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
      reply = ((await r.json()).content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    }
  } catch (e) {
    console.error("[HMT] LLM request failed:", e);
    const code = /^\d{3}/.exec((e as Error).message)?.[0];
    if (code === "503") {
      return NextResponse.json(
        { error: "The model is temporarily at capacity. Please try again in a minute." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    return NextResponse.json({ error: `Coach is offline${code ? ` (provider error ${code})` : ""}. Check the terminal running npm run dev for details.` }, { status: 502 });
  }
  if (!reply.trim()) return NextResponse.json({ error: "Coach sent an empty reply. Try again." }, { status: 502 });
  return NextResponse.json({ reply });
}
