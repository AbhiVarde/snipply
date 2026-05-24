"use client";

import { useState, useRef, useEffect } from "react";
import * as Babel from "@babel/standalone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toaster, toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { saveLocal, getLocal } from "@/lib/db";

const DEFAULT = `function Hero() {
  return (
    <div style={{ padding: 40, background: '#1e40af', borderRadius: 16, textAlign: 'center' }}>
      <h1 style={{ color: 'white', fontSize: 28, marginBottom: 12 }}>
        First partner to exceptional teams
      </h1>
      <p style={{ color: '#bfdbfe', marginBottom: 24, fontSize: 15 }}>
        Build and ship faster with our platform
      </p>
      <button style={{ background: 'white', color: '#1e40af', padding: '10px 28px', borderRadius: 999, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
        Get Started
      </button>
    </div>
  )
}`;

function toHex(rgb = "") {
  const m = rgb.match(/\d+/g);
  if (!m) return "#000000";
  return (
    "#" +
    m
      .slice(0, 3)
      .map((n) => (+n).toString(16).padStart(2, "0"))
      .join("")
  );
}

function buildDoc(code) {
  try {
    const clean = code
      .replace(/export\s+default\s+function\s+/, "function ")
      .replace(/export\s+default\s+/, "");
    const js = Babel.transform(clean, { presets: ["react"] }).code;
    const name = code.match(/function\s+([A-Z]\w*)/)?.[1] ?? "App";
    return `<!DOCTYPE html><html><head>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<style>*{box-sizing:border-box}body{margin:20px;font-family:sans-serif}</style>
</head><body><div id="root"></div><script>
${js}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(${name}))
window.addEventListener('message', e => {
  if (e.data.type !== 'patch') return
  const el = document.querySelector(e.data.sel)
  if (!el) return
  if (e.data.prop === 'text') el.innerText = e.data.val
  else el.style[e.data.prop] = e.data.val
})
document.addEventListener('click', e => {
  e.preventDefault()
  const el = e.target
  const tag = el.tagName.toLowerCase()
  const idx = [...document.querySelectorAll(tag)].indexOf(el)
  const s = getComputedStyle(el)
  window.parent.postMessage({
    type: 'selected', tag,
    sel: tag + ':nth-of-type(' + (idx + 1) + ')',
    text: el.innerText,
    color: s.color,
    background: s.backgroundColor
  }, '*')
})
</script></body></html>`;
  } catch (e) {
    return `<html><body><pre style="color:red;padding:16px;font-size:13px">${e.message}</pre></body></html>`;
  }
}

function CodeEditor({ value, onChange }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const lineCount = value.split("\n").length;

  const syncScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden font-mono text-[13px] leading-5.5">
      <div
        ref={gutterRef}
        aria-hidden
        className="select-none overflow-hidden shrink-0 bg-muted/40 border-r text-muted-foreground/60 text-right"
        style={{ width: 40, paddingTop: 12, paddingBottom: 12 }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            style={{
              height: 22,
              lineHeight: "22px",
              paddingRight: 8,
              fontSize: 11,
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        className="flex-1 min-w-0 resize-none border-0 outline-none focus:outline-none bg-background text-foreground"
        style={{
          padding: "12px 12px 12px 10px",
          lineHeight: "22px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          overflowWrap: "break-word",
          overflowX: "hidden",
          overflowY: "auto",
          tabSize: 2,
          fontFamily: "inherit",
          fontSize: "inherit",
        }}
      />
    </div>
  );
}

export default function Page() {
  const [code, setCode] = useState(DEFAULT);
  const [doc, setDoc] = useState(() => buildDoc(DEFAULT));
  const [sel, setSel] = useState(null);
  const [cid, setCid] = useState(null);
  const [userId, setUserId] = useState(null);
  const [ownerId, setOwnerId] = useState(null);
  const [tab, setTab] = useState("editor");
  const [title, setTitle] = useState("Untitled");
  const [online, setOnline] = useState(true);
  const iframe = useRef(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => {
      setOnline(true);
      toast.success("Back online");
    };
    const down = () => {
      setOnline(false);
      toast.warning("You're offline — saves go to local cache");
    };
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) toast.error("Auth failed: " + error.message);
        else setUserId(data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    const fn = (e) => e.data?.type === "selected" && setSel(e.data);
    window.addEventListener("message", fn);
    return () => window.removeEventListener("message", fn);
  }, []);

  const patch = (prop, val) => {
    setSel((p) => ({ ...p, [prop]: val }));
    iframe.current?.contentWindow?.postMessage(
      { type: "patch", sel: sel.sel, prop, val },
      "*",
    );
  };

  const run = () => {
    setDoc(buildDoc(code));
    setSel(null);
    setTab("preview");
  };

  const isOwner = !ownerId || ownerId === userId;

  const save = async () => {
    if (!userId) {
      toast.error("Still loading auth, try again in a second");
      return;
    }

    if (!online) {
      const localId = cid || crypto.randomUUID();
      await saveLocal({
        id: localId,
        code,
        title,
        author_id: userId,
        forked_from: null,
        pending: true,
      });
      setCid(localId);
      setOwnerId(userId);
      window.history.pushState({}, "", `/c/${localId}`);
      toast.warning("Saved locally — will sync when back online");
      return;
    }

    const saving = toast.loading(cid && isOwner ? "Updating..." : "Saving...");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Auth session not ready");
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      };

      if (cid && isOwner) {
        const res = await fetch(`/api/component/${cid}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ code, title }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        await saveLocal({
          id: cid,
          code,
          title,
          author_id: userId,
          forked_from: null,
          pending: false,
        });
        toast.success("Updated!", { id: saving });
      } else {
        const res = await fetch("/api/component", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ code, title, forked_from: cid || null }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        await saveLocal({
          id: json.id,
          code,
          title,
          author_id: userId,
          forked_from: null,
          pending: false,
        });
        setCid(json.id);
        setOwnerId(userId);
        window.history.pushState({}, "", `/c/${json.id}`);
        toast.success("Saved! Share link is ready.", { id: saving });
      }
    } catch (err) {
      toast.error("Failed: " + err.message, { id: saving });
    }
  };

  const fork = async () => {
    if (!userId || !cid) return;
    const forking = toast.loading("Forking...");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Auth session not ready");
      const res = await fetch("/api/component", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          code,
          title: title + " (fork)",
          forked_from: cid,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      await saveLocal({
        id: json.id,
        code,
        title: title + " (fork)",
        author_id: userId,
        forked_from: cid,
        pending: false,
      });
      setCid(json.id);
      setOwnerId(userId);
      setTitle(title + " (fork)");
      window.history.pushState({}, "", `/c/${json.id}`);
      toast.success("Forked! Now it's yours.", { id: forking });
    } catch (err) {
      toast.error("Fork failed: " + err.message, { id: forking });
    }
  };

  const share = () => {
    if (!cid) {
      toast.error("Save first to get a share link");
      return;
    }
    navigator.clipboard.writeText(`${window.location.origin}/c/${cid}`);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="flex flex-col h-svh bg-background text-foreground overflow-hidden">
      <Toaster position="top-center" richColors />

      <header className="shrink-0 border-b bg-background">
        <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
          <span className="font-semibold text-sm tracking-tight shrink-0">
            Snipply
          </span>

          <Input
            className="h-7 text-xs rounded-full border-dashed w-28 sm:w-36 shrink-0"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex items-center gap-1.5">
            {cid && (
              <Badge
                variant="secondary"
                className="font-mono text-[10px] rounded-full hidden lg:flex shrink-0"
              >
                {cid.slice(0, 8)}
              </Badge>
            )}
            <span
              className={`hidden sm:flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                online
                  ? "bg-green-500/10 text-green-600"
                  : "bg-yellow-500/10 text-yellow-600"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${online ? "bg-green-500" : "bg-yellow-500"}`}
              />
              {online ? "Online" : "Offline"}
            </span>
          </div>

          <div className="ml-auto hidden sm:flex items-center gap-1.5">
            {cid && !isOwner && (
              <Button
                size="sm"
                variant="outline"
                onClick={fork}
                className="rounded-full text-xs h-7 px-3"
              >
                Fork
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={share}
              className="rounded-full text-xs h-7 px-3"
            >
              Share
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={save}
              className="rounded-full text-xs h-7 px-3"
            >
              {cid && isOwner ? "Update" : "Save"}
            </Button>
          </div>

          <Button
            size="sm"
            onClick={run}
            className="rounded-full text-xs h-7 px-3 ml-auto sm:ml-1.5"
          >
            Run
          </Button>
        </div>

        <div className="flex items-center gap-2 px-3 pb-2 sm:hidden">
          <div className="flex gap-0.5 bg-muted rounded-full p-0.5">
            {["editor", "preview"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  tab === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {cid && !isOwner && (
              <Button
                size="sm"
                variant="outline"
                onClick={fork}
                className="rounded-full text-xs h-7 px-3"
              >
                Fork
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={share}
              className="rounded-full text-xs h-7 px-3"
            >
              Share
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={save}
              className="rounded-full text-xs h-7 px-3"
            >
              {cid && isOwner ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
        <div
          className={`flex-col sm:flex sm:w-1/2 sm:border-r min-h-0 ${tab === "editor" ? "flex flex-1" : "hidden"}`}
        >
          <CodeEditor value={code} onChange={setCode} />
        </div>

        <div
          className={`flex-col sm:flex sm:w-1/2 min-h-0 overflow-hidden ${tab === "preview" ? "flex flex-1" : "hidden"}`}
        >
          <iframe
            ref={iframe}
            srcDoc={doc}
            className="flex-1 w-full border-0 min-h-0"
            sandbox="allow-scripts"
          />
          <div className="border-t shrink-0 p-3">
            {sel ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Editing
                  </span>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] rounded-full"
                  >
                    {sel.tag}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">Text</p>
                    <Input
                      className="h-8 text-sm rounded-lg"
                      value={sel.text}
                      onChange={(e) => patch("text", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">
                      Text color
                    </p>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        className="h-8 w-9 rounded-lg border cursor-pointer p-0.5 shrink-0"
                        value={toHex(sel.color)}
                        onChange={(e) => patch("color", e.target.value)}
                      />
                      <Input
                        className="h-8 text-xs font-mono rounded-lg min-w-0"
                        value={toHex(sel.color)}
                        onChange={(e) => patch("color", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">
                      Background
                    </p>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        className="h-8 w-9 rounded-lg border cursor-pointer p-0.5 shrink-0"
                        value={toHex(sel.background)}
                        onChange={(e) => patch("background", e.target.value)}
                      />
                      <Input
                        className="h-8 text-xs font-mono rounded-lg min-w-0"
                        value={toHex(sel.background)}
                        onChange={(e) => patch("background", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                Click any element in the preview to edit it
              </p>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t px-4 py-2 shrink-0 flex items-center justify-center">
        <p className="text-[11px] text-muted-foreground text-center">
          Built with Supabase · Next.js · shadcn/ui by{" "}
          <a
            href="https://abhivarde.in"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            abhivarde.in
          </a>
        </p>
      </footer>
    </div>
  );
}
