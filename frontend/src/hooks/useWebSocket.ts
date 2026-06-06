"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WSEvent } from "@/types";

type Handler = (event: WSEvent) => void;
export type WSStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

export function useWebSocket(investigationId: string | null, onEvent: Handler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef<Handler>(onEvent);
  handlerRef.current = onEvent;

  const [wsStatus, setWsStatus] = useState<WSStatus>("connecting");

  const connect = useCallback(() => {
    if (!investigationId) return;
    setWsStatus("connecting");
    const base = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";
    const ws = new WebSocket(`${base}/api/ws/investigation/${investigationId}`);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("connected");

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as WSEvent;
        handlerRef.current(event);
      } catch {
        // malformed frame — ignore
      }
    };

    ws.onclose = (e) => {
      if (e.code !== 1000 && e.code !== 4004) {
        setWsStatus("reconnecting");
        setTimeout(connect, 2000);
      } else {
        setWsStatus("disconnected");
      }
    };

    ws.onerror = () => setWsStatus("reconnecting");
  }, [investigationId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close(1000);
    };
  }, [connect]);

  return { wsStatus, reconnect: connect };
}
