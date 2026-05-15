import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Trash2, Copy, ClipboardPaste, CheckCircle2, Circle, Film, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LANGUAGES = ["ARABIC", "GERMAN", "ENGLISH", "SPANISH", "FRENCH"] as const;
type Language = typeof LANGUAGES[number];

interface MovieEntry {
  id: string;
  number: string;
  names: Record<Language, string>;
  made: boolean;
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

function formatNumber(n: number): string {
  return String(n).padStart(3, "0");
}

const STORAGE_KEY = "movie-names-data";

function loadData(): MovieEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    { id: generateId(), number: "001", names: { ARABIC: "", GERMAN: "", ENGLISH: "", SPANISH: "", FRENCH: "" }, made: false },
    { id: generateId(), number: "002", names: { ARABIC: "", GERMAN: "", ENGLISH: "", SPANISH: "", FRENCH: "" }, made: false },
  ];
}

function saveData(entries: MovieEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function MovieTracker() {
  const [entries, setEntries] = useState<MovieEntry[]>(loadData);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    saveData(entries);
  }, [entries]);

  const addRow = useCallback(() => {
    setEntries(prev => {
      const nextNum = prev.length + 1;
      const newEntry: MovieEntry = {
        id: generateId(),
        number: formatNumber(nextNum),
        names: { ARABIC: "", GERMAN: "", ENGLISH: "", SPANISH: "", FRENCH: "" },
        made: false,
      };
      return [...prev, newEntry];
    });
  }, []);

  const updateName = useCallback((id: string, lang: Language, value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, names: { ...e.names, [lang]: value } } : e));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const filtered = prev.filter(e => e.id !== id);
      return filtered.map((e, i) => ({ ...e, number: formatNumber(i + 1) }));
    });
  }, []);

  const copyCell = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ description: "Copied to clipboard" });
    } catch {
      toast({ description: "Could not copy", variant: "destructive" });
    }
  }, [toast]);

  const pasteCell = useCallback(async (id: string, lang: Language) => {
    try {
      const text = await navigator.clipboard.readText();
      updateName(id, lang, text);
      toast({ description: "Pasted from clipboard" });
    } catch {
      toast({ description: "Could not paste", variant: "destructive" });
    }
  }, [updateName, toast]);

  const clearCell = useCallback((id: string, lang: Language) => {
    updateName(id, lang, "");
  }, [updateName]);

  const toggleMade = useCallback((id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, made: !e.made } : e));
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setHighlightedId(null);
      return;
    }
    const q = query.trim().toLowerCase();
    const found = entries.find(e => {
      if (e.number.toLowerCase().includes(q)) return true;
      return LANGUAGES.some(lang => e.names[lang].toLowerCase().includes(q));
    });
    if (found) {
      setHighlightedId(found.id);
      setTimeout(() => {
        const el = rowRefs.current[found.id];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("highlight-row");
          setTimeout(() => el.classList.remove("highlight-row"), 1000);
        }
      }, 50);
    } else {
      setHighlightedId(null);
    }
  }, [entries]);

  const clearSearch = () => {
    setSearchQuery("");
    setHighlightedId(null);
  };

  const filteredEntries = searchQuery.trim()
    ? entries.filter(e => {
        const q = searchQuery.trim().toLowerCase();
        if (e.number.toLowerCase().includes(q)) return true;
        return LANGUAGES.some(lang => e.names[lang].toLowerCase().includes(q));
      })
    : entries;

  const totalCount = entries.length;
  const madeCount = entries.filter(e => e.made).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* LEFT: Logo + Title + Stats */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Film className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold text-foreground">Movie Names</h1>
              <span className="bg-accent/15 text-accent px-2.5 py-1 rounded-md text-xs font-semibold">{madeCount} Made</span>
              <span className="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-medium">{totalCount - madeCount} Pending</span>
            </div>

            {/* RIGHT: Search + Add */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  className="w-full pl-9 pr-8 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
                  placeholder="Search by name or number..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                onClick={addRow}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mx-auto px-4 py-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div>
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-secondary/60 border-b border-border">
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-14">NO</th>
                  {LANGUAGES.map(lang => (
                    <th key={lang} className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {lang}
                    </th>
                  ))}
                  <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">MADE</th>
                  <th className="w-8 px-1 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    ref={el => { rowRefs.current[entry.id] = el; }}
                    className={`group transition-colors ${
                      entry.made
                        ? "bg-accent/5 hover:bg-accent/10"
                        : "hover:bg-secondary/30"
                    } ${highlightedId === entry.id ? "bg-primary/8" : ""}`}
                  >
                    {/* Number */}
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center justify-center w-10 h-7 rounded-md text-xs font-bold tabular-nums ${
                        entry.made
                          ? "bg-accent/20 text-accent"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {entry.number}
                      </span>
                    </td>

                    {/* Language cells */}
                    {LANGUAGES.map(lang => (
                      <td key={lang} className="px-2 py-2">
                        <CellInput
                          value={entry.names[lang]}
                          onChange={val => updateName(entry.id, lang, val)}
                          onCopy={() => copyCell(entry.names[lang])}
                          onPaste={() => pasteCell(entry.id, lang)}
                          onClear={() => clearCell(entry.id, lang)}
                          disabled={entry.made}
                        />
                      </td>
                    ))}

                    {/* Made toggle */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => toggleMade(entry.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                          entry.made
                            ? "bg-accent/20 text-accent hover:bg-accent/30"
                            : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                        title={entry.made ? "Mark as not made" : "Mark as made"}
                      >
                        {entry.made
                          ? <><CheckCircle2 className="w-3.5 h-3.5" /><span>Done</span></>
                          : <><Circle className="w-3.5 h-3.5" /><span>Mark</span></>
                        }
                      </button>
                    </td>

                    {/* Delete */}
                    <td className="px-2 py-2">
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                      {searchQuery ? `No results found for "${searchQuery}"` : "No entries yet. Add a row to get started."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add row footer button */}
        <div className="flex justify-center mt-4">
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-6 py-2.5 bg-secondary hover:bg-secondary/70 border border-border text-sm font-medium text-foreground rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Row
          </button>
        </div>
      </div>
    </div>
  );
}

interface CellInputProps {
  value: string;
  onChange: (val: string) => void;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  disabled?: boolean;
}

function CellInput({ value, onChange, onCopy, onPaste, onClear, disabled }: CellInputProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  return (
    <div
      className="relative group/cell"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Floating toolbar — appears above the cell */}
      {(hovered || focused) && (
        <div className="absolute -top-8 left-0 z-30 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-md px-1 py-0.5">
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onCopy(); }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Copy"
            tabIndex={-1}
          >
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </button>
          {!disabled && (
            <>
              <div className="w-px h-3 bg-border" />
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); onPaste(); }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Paste"
                tabIndex={-1}
              >
                <ClipboardPaste className="w-3 h-3" />
                <span>Paste</span>
              </button>
              {value && (
                <>
                  <div className="w-px h-3 bg-border" />
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); onClear(); }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Clear"
                    tabIndex={-1}
                  >
                    <X className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Textarea — auto grows tall to show full name */}
      <textarea
        ref={textareaRef}
        value={value}
        rows={1}
        onChange={e => !disabled && onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        className={`w-full px-2.5 py-2 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring resize-none overflow-hidden leading-snug ${
          focused
            ? "border-ring bg-card"
            : "border-border bg-background hover:border-muted-foreground/40"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      />
    </div>
  );
}
