"use client";

import { useCallback, useEffect, useRef } from "react";
import type { WSEvent } from "@/types";

type Handler = (event: WSEvent) => void;

export function useWebSocket(investigationId: string | null, onEvent: Handler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef<Handler>(onEvent);
  handlerRef.current = onEvent;

  const connect = useCallback(() => {
    if (!investigationId) return;
    const base = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";
    const ws = new WebSocket(`${base}/api/ws/investigation/${investigationId}`);
    wsRef.current = ws;

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
        setTimeout(connect, 2000);
      }
    };
  }, [investigationId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close(1000);
    };
  }, [connect]);
}
