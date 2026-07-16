/**
 * Notes — notebooks sidebar + list of notes + editor with autosave.
 * Editor uses contentEditable; content is sanitized on save to prevent XSS.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/app-utils";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Star, Trash2, Bold, Italic, List as ListIcon, Heading2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Notes — MAAR" }] }),
  component: NotesPage,
});

/** Basic HTML sanitizer — strips scripts/handlers. */
function sanitize(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  const walk = (node: Element) => {
    if (["SCRIPT","STYLE","IFRAME","OBJECT","EMBED"].includes(node.tagName)) { node.remove(); return; }
    [...node.attributes].forEach(attr => {
      const n = attr.name.toLowerCase();
      if (n.startsWith("on") || (n === "href" && attr.value.trim().toLowerCase().startsWith("javascript:"))) {
        node.removeAttribute(attr.name);
      }
    });
    [...node.children].forEach(walk);
  };
  [...template.content.children].forEach(walk);
  return template.innerHTML;
}

function NotesPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const notes = useQuery({
    queryKey: ["notes", search],
    queryFn: async () => {
      const uid = await getUserId();
      let q = supabase.from("notes").select("*").eq("user_id", uid).order("updated_at", { ascending: false });
      if (search.trim()) q = q.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const uid = await getUserId();
      const { data, error } = await supabase.from("notes").insert({ user_id: uid, title: "Untitled" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["notes"] }); setSelectedId(data.id); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); setSelectedId(null); toast.success("Note deleted"); },
  });

  const selected = notes.data?.find(n => n.id === selectedId) ?? null;

  return (
    <AppShell title="Notes">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Sidebar list */}
        <aside className="rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 p-3">
            <Input placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)} />
            <Button size="icon" onClick={() => create.mutate()} aria-label="New note"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="max-h-[70vh] divide-y divide-border overflow-auto">
            {notes.data?.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No notes yet.</p>}
            {notes.data?.map(n => (
              <button
                key={n.id}
                onClick={() => setSelectedId(n.id)}
                className={cn("w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent", selectedId === n.id && "bg-accent")}
              >
                <div className="flex items-center gap-2">
                  {n.is_favorite && <Star className="h-3 w-3 text-warning" />}
                  <p className="truncate font-medium">{n.title || "Untitled"}</p>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {new Date(n.updated_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </aside>

        {/* Editor */}
        <section className="rounded-xl border border-border bg-card p-4">
          {selected ? (
            <NoteEditor
              key={selected.id}
              note={selected}
              onDelete={() => del.mutate(selected.id)}
            />
          ) : (
            <div className="flex h-[60vh] items-center justify-center text-center">
              <div>
                <p className="text-muted-foreground">Pick a note, or create a new one.</p>
                <Button className="mt-4" onClick={() => create.mutate()}><Plus className="h-4 w-4" /> New note</Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function NoteEditor({ note, onDelete }: {
  note: { id: string; title: string; content: string; is_favorite: boolean };
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(note.title);
  const [fav, setFav] = useState(note.is_favorite);
  const editorRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState("Saved");

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = note.content || "";
  }, [note.id]); // reset editor when switching notes

  const save = useMutation({
    mutationFn: async () => {
      const content = sanitize(editorRef.current?.innerHTML ?? "");
      const { error } = await supabase.from("notes").update({
        title: title.slice(0, 200), content, is_favorite: fav,
      }).eq("id", note.id);
      if (error) throw error;
    },
    onMutate: () => setSaved("Saving…"),
    onSuccess: () => { setSaved("Saved"); qc.invalidateQueries({ queryKey: ["notes"] }); },
    onError: () => setSaved("Save failed"),
  });

  function scheduleSave() {
    setSaved("Editing…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save.mutate(), 800);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Input
          value={title}
          onChange={e => { setTitle(e.target.value); scheduleSave(); }}
          className="border-0 bg-transparent px-0 font-display text-2xl font-semibold shadow-none focus-visible:ring-0"
          placeholder="Note title"
        />
        <Button variant="ghost" size="icon" onClick={() => { setFav(!fav); scheduleSave(); }} aria-label="Favorite">
          <Star className={cn("h-4 w-4", fav && "fill-warning text-warning")} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete note"><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-1">
        <ToolbarBtn onClick={() => { document.execCommand("bold"); scheduleSave(); }} label="Bold"><Bold className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => { document.execCommand("italic"); scheduleSave(); }} label="Italic"><Italic className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => { document.execCommand("formatBlock", false, "h2"); scheduleSave(); }} label="Heading"><Heading2 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => { document.execCommand("insertUnorderedList"); scheduleSave(); }} label="Bullets"><ListIcon className="h-4 w-4" /></ToolbarBtn>
        <span className="ml-auto pr-2 text-xs text-muted-foreground">{saved}</span>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={scheduleSave}
        onBlur={() => save.mutate()}
        className="prose prose-sm min-h-[50vh] max-w-none rounded-lg border border-border bg-background p-4 text-foreground outline-none focus:ring-2 focus:ring-ring/30 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6"
        aria-label="Note editor"
      />
    </div>
  );
}

function ToolbarBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={onClick} aria-label={label} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
      {children}
    </button>
  );
}
