"use client";
import { io, Socket } from "socket.io-client";

let hostSocket: Socket | null = null;
let spectatorSocket: Socket | null = null;

export function getSocket(role: "host" | "spectator"): Socket {
  if (role === "host") {
    if (!hostSocket) hostSocket = io({ query: { role: "host" } });
    return hostSocket;
  }
  if (!spectatorSocket) spectatorSocket = io({ query: { role: "spectator" } });
  return spectatorSocket;
}
