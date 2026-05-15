"use client";
import { useState } from "react";
import { getSocket } from "@/lib/socket-client";
import type { Team } from "@/lib/types";

export function CreateView({ packs, teams }: {
  packs: { id: string; name: string }[];
  teams: Team[];
}) {
  const [packId, setPackId] = useState<string>("");
  const [roundTimeSec, setRoundTimeSec] = useState(60);
  const [penaltyPct, setPenaltyPct] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const submit = () => {
    if (!packId || selected.size < 2) return;
    getSocket("host").emit("host:create-game", {
      packId,
      settings: { roundTimeSec, penaltyPct },
      teamIds: Array.from(selected),
    });
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    let logoUrl: string | undefined;
    const fileInput = document.getElementById("logo-input") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-logo", { method: "POST", body: fd });
      const data = await res.json();
      logoUrl = data.url;
    }
    const team: Team = await new Promise(r =>
      getSocket("host").emit("host:create-team", { name: newTeamName.trim(), logoUrl }, r)
    );
    setSelected(new Set([...selected, team.id]));
    setNewTeamName("");
    if (fileInput) fileInput.value = "";
    setCreatingTeam(false);
  };

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold tracking-wide">Создание игры</h1>

      <section className="space-y-3">
        <label className="block text-lg">
          <span className="block mb-1 text-yellow-300">Пакет вопросов</span>
          <select
            className="w-full text-black p-2 rounded"
            value={packId}
            onChange={e => setPackId(e.target.value)}
          >
            <option value="">— выберите —</option>
            {packs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </section>

      <section className="flex gap-6">
        <label className="flex-1">
          <span className="block mb-1 text-yellow-300">Время раунда (сек)</span>
          <input
            type="number"
            className="w-full text-black p-2 rounded"
            value={roundTimeSec}
            onChange={e => setRoundTimeSec(+e.target.value)}
          />
        </label>
        <label className="flex-1">
          <span className="block mb-1 text-yellow-300">Штраф (%)</span>
          <input
            type="number"
            className="w-full text-black p-2 rounded"
            value={penaltyPct}
            onChange={e => setPenaltyPct(+e.target.value)}
          />
        </label>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3 text-yellow-300">Команды</h2>
        <div className="grid grid-cols-3 gap-3">
          {teams.map(t => (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className={`p-3 rounded border-2 flex items-center gap-3 transition ${
                selected.has(t.id)
                  ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_16px_rgba(245,197,24,0.3)]"
                  : "border-white/20 hover:border-white/40"
              }`}
            >
              {t.logoUrl && <img src={t.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />}
              <span className="font-semibold">{t.name}</span>
            </button>
          ))}
          {!creatingTeam && (
            <button
              onClick={() => setCreatingTeam(true)}
              className="p-3 rounded border-2 border-dashed border-white/30 hover:border-yellow-400 hover:text-yellow-400 transition"
            >
              + Новая команда
            </button>
          )}
        </div>
        {creatingTeam && (
          <div className="mt-4 p-4 rounded bg-white/5 space-y-3">
            <input
              className="w-full text-black p-2 rounded"
              placeholder="Название команды"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
            />
            <input id="logo-input" type="file" accept="image/*" className="text-sm" />
            <div className="flex gap-2">
              <button
                onClick={createTeam}
                className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded"
              >
                Создать
              </button>
              <button
                onClick={() => setCreatingTeam(false)}
                className="px-4 py-2 border border-white/30 rounded"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </section>

      <button
        onClick={submit}
        disabled={!packId || selected.size < 2}
        className="px-8 py-4 bg-yellow-400 text-black font-bold text-xl rounded disabled:opacity-30 shadow-[0_0_24px_rgba(245,197,24,0.4)]"
      >
        Начать игру
      </button>
    </main>
  );
}
