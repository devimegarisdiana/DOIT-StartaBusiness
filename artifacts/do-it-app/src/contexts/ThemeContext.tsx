import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "default" | "dark" | "comic";

interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void; }
const Ctx = createContext<ThemeCtx>({ theme: "default", setTheme: () => {} });

export const THEMES: Record<Theme, {
  label: string; emoji: string;
  bg: string; header: string; card: string;
  text: string; accent: string; subtext: string; border: string;
}> = {
  default: { label:"Klasik", emoji:"🔵", bg:"#d6eeff", header:"#1a3a6b", card:"#ffffff", text:"#1a3a6b", accent:"#2478d4", subtext:"#64748b", border:"#e2e8f0" },
  dark:    { label:"Malam",  emoji:"🌙", bg:"#0f172a", header:"#1e293b", card:"#1e293b", text:"#e2e8f0", accent:"#38bdf8", subtext:"#94a3b8", border:"#334155" },
  comic:   { label:"Komik",  emoji:"🎨", bg:"#fff9c4", header:"#ff6b35", card:"#ffffff", text:"#1a1a2e", accent:"#ff6b35", subtext:"#6b5b93", border:"#fde68a" },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem("doitTheme") as Theme) || "default");
  function setTheme(t: Theme) { setThemeState(t); localStorage.setItem("doitTheme", t); }
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() { return useContext(Ctx); }
