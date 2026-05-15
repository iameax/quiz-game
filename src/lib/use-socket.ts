"use client";
import { useEffect, useState } from "react";
import { getSocket } from "./socket-client";
import type { HydratedGameState, Team } from "./types";

export function useGameClient(role: "host" | "spectator") {
  const [state, setState] = useState<HydratedGameState | null>(null);
  const [packs, setPacks] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket(role);
    s.on("state", setState);
    s.on("packs", setPacks);
    s.on("teams", setTeams);
    const errHandler = (e: { message: string }) => setError(e.message);
    s.on("error", errHandler);
    return () => {
      s.off("state", setState);
      s.off("packs", setPacks);
      s.off("teams", setTeams);
      s.off("error", errHandler);
    };
  }, [role]);

  return { state, packs, teams, error, socket: getSocket(role) };
}
