import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { translateBatch } from "@/lib/translate.functions";

const STORAGE_KEY = "leadtrace_lang";
const cacheKey = (lang: string) => `leadtrace_tr_${lang}`;

type Ctx = {
  lang: string;
  setLang: (lang: string) => void;
  translating: boolean;
};

const TranslationContext = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  translating: false,
});

export function useTranslation() {
  return useContext(TranslationContext);
}

const SKIP = "script,style,noscript,code,pre,textarea,svg,[data-no-translate]";

function collectTextNodes(): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const value = node.nodeValue;
      if (!value || !value.trim() || !/[A-Za-z]{2}/.test(value)) return NodeFilter.FILTER_REJECT;
      const parent = (node as Text).parentElement;
      if (!parent || parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) out.push(n as Text);
  return out;
}

function collectPlaceholders(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>("input[placeholder],textarea[placeholder]"),
  ).filter((el) => el.placeholder.trim() && !el.closest("[data-no-translate]"));
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState("en");
  const [translating, setTranslating] = useState(false);
  const cache = useRef<Map<string, string>>(new Map());
  const originals = useRef<WeakMap<Text, string>>(new WeakMap());
  const originalPlaceholders = useRef<WeakMap<HTMLElement, string>>(new WeakMap());
  const langRef = useRef("en");
  const inFlight = useRef(false);
  const pending = useRef(false);

  // Load persisted language + cache.
  useEffect(() => {
    let stored = "en";
    try {
      stored = localStorage.getItem(STORAGE_KEY) || "en";
    } catch {
      /* ignore */
    }
    if (stored && stored !== "en") {
      try {
        const raw = localStorage.getItem(cacheKey(stored));
        if (raw) cache.current = new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
      } catch {
        /* ignore */
      }
      langRef.current = stored;
      setLangState(stored);
    }
  }, []);

  const persistCache = useCallback((l: string) => {
    try {
      localStorage.setItem(cacheKey(l), JSON.stringify(Object.fromEntries(cache.current)));
    } catch {
      /* quota — cache stays in memory only */
    }
  }, []);

  const restoreEnglish = useCallback(() => {
    for (const node of collectTextNodes()) {
      const original = originals.current.get(node);
      if (original !== undefined && node.nodeValue !== original) node.nodeValue = original;
    }
    for (const el of collectPlaceholders()) {
      const original = originalPlaceholders.current.get(el);
      if (original !== undefined) el.placeholder = original;
    }
  }, []);

  const translatePage = useCallback(
    async (target: string) => {
      if (target === "en") {
        restoreEnglish();
        return;
      }
      if (inFlight.current) {
        pending.current = true;
        return;
      }
      inFlight.current = true;
      try {
        const nodes = collectTextNodes();
        const placeholders = collectPlaceholders();

        type Job = { source: string; apply: (value: string) => void };
        const jobs: Job[] = [];

        for (const node of nodes) {
          if (!originals.current.has(node)) originals.current.set(node, node.nodeValue ?? "");
          const source = (originals.current.get(node) ?? "").trim();
          if (!source) continue;
          jobs.push({ source, apply: (v) => { node.nodeValue = v; } });
        }
        for (const el of placeholders) {
          if (!originalPlaceholders.current.has(el)) originalPlaceholders.current.set(el, el.placeholder);
          const source = (originalPlaceholders.current.get(el) ?? "").trim();
          if (!source) continue;
          jobs.push({ source, apply: (v) => { el.placeholder = v; } });
        }

        // Apply anything already cached immediately.
        const missing = new Set<string>();
        for (const job of jobs) {
          const hit = cache.current.get(job.source);
          if (hit) job.apply(hit);
          else missing.add(job.source);
        }

        const todo = Array.from(missing);
        if (todo.length === 0) return;

        setTranslating(true);
        for (let i = 0; i < todo.length; i += 40) {
          const chunk = todo.slice(i, i + 40);
          try {
            const res = await translateBatch({ data: { lang: target, texts: chunk } });
            res.items.forEach((value, idx) => cache.current.set(chunk[idx], value));
          } catch {
            break;
          }
          if (langRef.current !== target) return;
          for (const job of jobs) {
            const hit = cache.current.get(job.source);
            if (hit) job.apply(hit);
          }
        }
        persistCache(target);
      } finally {
        inFlight.current = false;
        setTranslating(false);
        if (pending.current) {
          pending.current = false;
          void translatePage(langRef.current);
        }
      }
    },
    [persistCache, restoreEnglish],
  );

  const setLang = useCallback(
    (next: string) => {
      langRef.current = next;
      setLangState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
        if (next !== "en") {
          const raw = localStorage.getItem(cacheKey(next));
          cache.current = raw
            ? new Map(Object.entries(JSON.parse(raw) as Record<string, string>))
            : new Map();
        }
      } catch {
        /* ignore */
      }
      void translatePage(next);
    },
    [translatePage],
  );

  // Re-translate as the SPA renders new content.
  useEffect(() => {
    if (lang === "en") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void translatePage(langRef.current), 350);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [lang, translatePage]);

  return (
    <TranslationContext.Provider value={{ lang, setLang, translating }}>
      {children}
    </TranslationContext.Provider>
  );
}
