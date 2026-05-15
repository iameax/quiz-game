import type { Server } from "socket.io";

export function registerSocketHandlers(io: Server) {
  io.on("connection", socket => {
    console.log("connected:", socket.id);
    socket.on("disconnect", () => console.log("disconnected:", socket.id));
  });
}
