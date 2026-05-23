"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import type { HydratedGameState } from "@/lib/types";

export function HostMenu({ state }: { state: HydratedGameState }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [roundTimeSec, setRoundTimeSec] = useState(state.settings.roundTimeSec);
  const [penaltyPct, setPenaltyPct] = useState(state.settings.penaltyPct);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  useEffect(() => {
    if (settingsOpen) {
      setRoundTimeSec(state.settings.roundTimeSec);
      setPenaltyPct(state.settings.penaltyPct);
    }
  }, [settingsOpen, state.settings.roundTimeSec, state.settings.penaltyPct]);

  const finishGame = () => {
    getSocket("host").emit("host:end-game");
    setMenuOpen(false);
  };
  const restartGame = () => {
    getSocket("host").emit("host:new-game");
    setMenuOpen(false);
  };
  const saveSettings = () => {
    getSocket("host").emit("host:update-settings", { roundTimeSec, penaltyPct });
    setSettingsOpen(false);
    setMenuOpen(false);
  };

  return (
    <>
      <div ref={menuRef} className="fixed top-4 right-4 z-20">
        <button
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Настройки"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400/60 text-white/70 hover:text-amber-300 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg bg-slate-900/95 backdrop-blur border border-white/10 shadow-xl overflow-hidden">
            <button
              onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}
              className="w-full text-left px-4 py-3 hover:bg-white/10 transition text-white"
            >
              Параметры игры
            </button>
            <button
              onClick={finishGame}
              className="w-full text-left px-4 py-3 hover:bg-white/10 transition text-white border-t border-white/5"
            >
              Завершить игру
            </button>
            <button
              onClick={restartGame}
              className="w-full text-left px-4 py-3 hover:bg-white/10 transition text-white border-t border-white/5"
            >
              Новая игра
            </button>
          </div>
        )}
      </div>

      {settingsOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-slate-900 border border-white/10 p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold">Параметры игры</h2>
            <label className="block">
              <span className="block mb-2 text-amber-300 text-sm font-medium uppercase tracking-wider">Время раунда (сек)</span>
              <input
                type="number"
                min={1}
                className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:border-amber-400 focus:bg-white/10 transition"
                value={roundTimeSec}
                onChange={e => setRoundTimeSec(+e.target.value)}
              />
            </label>
            <label className="block">
              <span className="block mb-2 text-amber-300 text-sm font-medium uppercase tracking-wider">Штраф (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:border-amber-400 focus:bg-white/10 transition"
                value={penaltyPct}
                onChange={e => setPenaltyPct(+e.target.value)}
              />
            </label>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 border border-white/20 hover:border-white/40 rounded-lg transition"
              >
                Отмена
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg transition"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
