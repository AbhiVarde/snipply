"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import * as Babel from "@babel/standalone";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLocal } from "@/lib/db";

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
</script></body></html>`;
  } catch (e) {
    return `<html><body><pre style="color:red">${e.message}</pre></body></html>`;
  }
}

export default function SharedPage() {
  const { id } = useParams();
  const router = useRouter();
  const [component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    async function load() {
      const cached = await getLocal(id);
      if (cached) {
        setComponent(cached);
        setFromCache(true);
        setLoading(false);
      }

      if (navigator.onLine) {
        try {
          const res = await fetch(`/api/component/${id}`);
          const data = await res.json();
          if (!data.error) {
            setComponent(data);
            setFromCache(false);
          }
        } catch {}
      }

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
        Loading...
      </div>
    );

  if (!component || component.error)
    return (
      <div className="flex items-center justify-center h-screen text-sm text-red-500">
        Component not found.
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0">
        <span className="font-semibold text-sm tracking-tight">Snipply</span>
        <span className="text-sm text-muted-foreground">{component.title}</span>
        {component.forked_from && (
          <Badge variant="secondary" className="text-[10px] rounded-full">
            forked
          </Badge>
        )}
        {fromCache && (
          <Badge
            variant="outline"
            className="text-[10px] rounded-full text-yellow-600 border-yellow-400"
          >
            cached
          </Badge>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            onClick={() => router.push(`/?id=${id}`)}
            className="rounded-full text-xs h-7 px-4"
          >
            Fork & Edit
          </Button>
        </div>
      </header>
      <iframe
        srcDoc={buildDoc(component.code)}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts"
      />
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
