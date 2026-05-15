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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);

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

  const uploadLogo = async (inputId: string): Promise<string | undefined> => {
    const fileInput = document.getElementById(inputId) as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) return undefined;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload-logo", { method: "POST", body: fd });
    const data = await res.json();
    if (fileInput) fileInput.value = "";
    return data.url;
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    const logoUrl = await uploadLogo("logo-input");
    const team: Team = await new Promise(r =>
      getSocket("host").emit("host:create-team", { name: newTeamName.trim(), logoUrl }, r)
    );
    setSelected(new Set([...selected, team.id]));
    setNewTeamName("");
    setCreatingTeam(false);
  };

  const startEdit = (t: Team) => {
    setEditingId(t.id);
    setEditName(t.name);
    setRemoveLogo(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setRemoveLogo(false);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const newLogo = await uploadLogo(`logo-edit-${id}`);
    const logoUrl = newLogo !== undefined ? newLogo : removeLogo ? null : undefined;
    await new Promise(r =>
      getSocket("host").emit(
        "host:update-team",
        { id, name: editName.trim(), logoUrl },
        r
      )
    );
    cancelEdit();
  };

  const deleteTeam = async (t: Team) => {
    if (!confirm(`Удалить команду «${t.name}»?`)) return;
    const res = await new Promise<{ ok: boolean; reason?: string }>(r =>
      getSocket("host").emit("host:delete-team", { id: t.id }, r)
    );
    if (!res.ok) {
      alert(`Не удалось удалить: ${res.reason ?? "ошибка"}`);
      return;
    }
    const next = new Set(selected);
    next.delete(t.id);
    setSelected(next);
  };

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold tracking-wide">Создание игры</h1>

      <section className="space-y-3">
        <label className="block text-lg">
          <span className="block mb-2 text-amber-300 text-sm font-medium uppercase tracking-wider">Пакет вопросов</span>
          <select
            className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:border-amber-400 focus:bg-white/10 transition"
            value={packId}
            onChange={e => setPackId(e.target.value)}
          >
            <option value="" className="text-slate-900">— выберите —</option>
            {packs.map(p => <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>)}
          </select>
        </label>
      </section>

      <section className="flex gap-6">
        <label className="flex-1">
          <span className="block mb-2 text-amber-300 text-sm font-medium uppercase tracking-wider">Время раунда (сек)</span>
          <input
            type="number"
            className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:border-amber-400 focus:bg-white/10 transition"
            value={roundTimeSec}
            onChange={e => setRoundTimeSec(+e.target.value)}
          />
        </label>
        <label className="flex-1">
          <span className="block mb-2 text-amber-300 text-sm font-medium uppercase tracking-wider">Штраф (%)</span>
          <input
            type="number"
            className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:border-amber-400 focus:bg-white/10 transition"
            value={penaltyPct}
            onChange={e => setPenaltyPct(+e.target.value)}
          />
        </label>
      </section>

      <section>
        <h2 className="text-amber-300 text-sm font-medium uppercase tracking-wider mb-3">Команды</h2>
        <ul className="flex flex-col gap-2">
          {teams.map(t => {
            const isSelected = selected.has(t.id);
            const isEditing = editingId === t.id;
            return (
              <li
                key={t.id}
                className={`rounded-lg border-2 transition ${
                  isSelected
                    ? "border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(255,201,60,0.25)]"
                    : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                }`}
              >
                {!isEditing ? (
                  <div className="flex items-center gap-3 p-3">
                    <button
                      onClick={() => toggle(t.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      {t.logoUrl ? (
                        <img src={t.logoUrl} alt="" className="w-12 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-9 rounded-lg bg-white/10 flex-shrink-0" />
                      )}
                      <span className="font-semibold">{t.name}</span>
                    </button>
                    <button
                      onClick={() => startEdit(t)}
                      className="px-3 py-1.5 text-sm border border-white/20 hover:border-amber-400 hover:text-amber-300 rounded-md transition"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => deleteTeam(t)}
                      className="px-3 py-1.5 text-sm border border-white/20 hover:border-red-400 hover:text-red-300 rounded-md transition"
                    >
                      Удалить
                    </button>
                  </div>
                ) : (
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      {t.logoUrl && !removeLogo ? (
                        <img src={t.logoUrl} alt="" className="w-12 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-9 rounded-lg bg-white/10 flex-shrink-0" />
                      )}
                      <input
                        className="flex-1 bg-white/5 border border-white/10 text-white p-2 rounded-lg focus:outline-none focus:border-amber-400 focus:bg-white/10 transition"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <input
                        id={`logo-edit-${t.id}`}
                        type="file"
                        accept="image/*"
                        className="text-sm text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-amber-400/20 file:text-amber-300 hover:file:bg-amber-400/30"
                      />
                      {t.logoUrl && (
                        <label className="flex items-center gap-2 text-sm text-white/70">
                          <input
                            type="checkbox"
                            checked={removeLogo}
                            onChange={e => setRemoveLogo(e.target.checked)}
                          />
                          Удалить логотип
                        </label>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(t.id)}
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg transition"
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 border border-white/20 hover:border-white/40 rounded-lg transition"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {!creatingTeam && (
            <li>
              <button
                onClick={() => setCreatingTeam(true)}
                className="w-full p-3 rounded-lg border-2 border-dashed border-white/20 text-white/60 hover:border-amber-400 hover:text-amber-300 hover:bg-amber-400/5 transition"
              >
                + Новая команда
              </button>
            </li>
          )}
        </ul>
        {creatingTeam && (
          <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
            <input
              className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:border-amber-400 focus:bg-white/10 transition placeholder:text-white/40"
              placeholder="Название команды"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
            />
            <input id="logo-input" type="file" accept="image/*" className="text-sm text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-amber-400/20 file:text-amber-300 hover:file:bg-amber-400/30" />
            <div className="flex gap-2">
              <button
                onClick={createTeam}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg transition"
              >
                Создать
              </button>
              <button
                onClick={() => setCreatingTeam(false)}
                className="px-4 py-2 border border-white/20 hover:border-white/40 rounded-lg transition"
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
        className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xl rounded-lg disabled:opacity-30 disabled:hover:bg-amber-400 shadow-[0_0_28px_rgba(255,201,60,0.35)] transition"
      >
        Начать игру
      </button>
    </main>
  );
}
