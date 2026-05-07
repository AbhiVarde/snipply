"use client";

import { useState, useRef, useEffect } from "react";
import * as Babel from "@babel/standalone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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

export default function Page() {
  const [code, setCode] = useState(DEFAULT);
  const [doc, setDoc] = useState(() => buildDoc(DEFAULT));
  const [sel, setSel] = useState(null);
  const [cid, setCid] = useState(null);
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState("editor");
  const iframe = useRef(null);

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

  const save = async () => {
    setStatus("saving");
    const res = cid
      ? await fetch(`/api/component/${cid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        })
      : await fetch("/api/component", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
    if (!cid) setCid((await res.json()).id);
    setStatus("saved");
    setTimeout(() => setStatus(""), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0">
        <span className="font-semibold text-sm tracking-tight">Runable</span>
        {cid && (
          <Badge
            variant="secondary"
            className="font-mono text-[10px] rounded-full"
          >
            {cid.slice(0, 8)}
          </Badge>
        )}
        <div className="md:hidden flex gap-1 ml-2">
          {["editor", "preview"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${tab === t ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={save}
            className="rounded-full text-xs h-7 px-4"
          >
            {status === "saved" ? "Saved!" : "Save"}
          </Button>
          <Button
            size="sm"
            onClick={run}
            className="rounded-full text-xs h-7 px-4"
          >
            Run
          </Button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <div
          className={`md:flex flex-col md:w-1/2 md:border-r min-h-0 ${tab === "editor" ? "flex flex-1" : "hidden"}`}
        >
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 resize-none font-mono text-[13px] rounded-none border-0 focus-visible:ring-0 leading-relaxed"
            spellCheck={false}
          />
        </div>

        <div
          className={`md:flex flex-col md:w-1/2 min-h-0 ${tab === "preview" ? "flex flex-1" : "hidden"}`}
        >
          <iframe
            ref={iframe}
            srcDoc={doc}
            className="flex-1 w-full border-0 min-h-0"
            sandbox="allow-scripts"
          />
          <div className="border-t shrink-0 p-4">
            {sel ? (
              <div className="space-y-3">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        className="h-8 w-9 rounded-lg border cursor-pointer p-0.5"
                        value={toHex(sel.color)}
                        onChange={(e) => patch("color", e.target.value)}
                      />
                      <Input
                        className="h-8 text-xs font-mono rounded-lg"
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
                        className="h-8 w-9 rounded-lg border cursor-pointer p-0.5"
                        value={toHex(sel.background)}
                        onChange={(e) => patch("background", e.target.value)}
                      />
                      <Input
                        className="h-8 text-xs font-mono rounded-lg"
                        value={toHex(sel.background)}
                        onChange={(e) => patch("background", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">
                Click any element in the preview to edit it
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
