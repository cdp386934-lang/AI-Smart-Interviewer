import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClientEvents, ServerEvents } from '@/types/shared';
import { useAppStore } from '@/store';

type Handler<T> = (payload: T) => void;

export interface UseWebSocketReturn {
  connected: boolean;
  authenticated: boolean;
  connecting: boolean;
  send: <T extends keyof ClientEvents>(event: T, payload: ClientEvents[T]) => void;
  on: <T extends keyof ServerEvents>(event: T, handler: Handler<ServerEvents[T]>) => () => void;
  once: <T extends keyof ServerEvents>(event: T, handler: Handler<ServerEvents[T]>) => void;
  connect: (token: string) => void;
  disconnect: () => void;
  reconnect: () => void;
  latency: number;
  lastPingTime: number;
}

export function useWebSocket(url = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws'): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [latency, setLatency] = useState(0);
  const [lastPingTime, setLastPingTime] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string>('');
  const queueRef = useRef<Array<{ event: keyof ClientEvents; payload: any }>>([]);
  const listenersRef = useRef(new Map<string, Set<Function>>());
  const onceRef = useRef(new Map<string, Set<Function>>());

  const emit = (event: string, payload: any) => {
    listenersRef.current.get(event)?.forEach((fn) => fn(payload));
    const onceSet = onceRef.current.get(event);
    onceSet?.forEach((fn) => fn(payload));
    onceSet?.clear();
  };

  const connect = (token: string) => {
    tokenRef.current = token;
    setConnecting(true);
    const ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
      ws.send(JSON.stringify({ event: 'auth', data: { token }, timestamp: new Date().toISOString() }));
      queueRef.current.forEach(({ event, payload }) => ws.send(JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })));
      queueRef.current = [];
      useAppStore.getState().setInterview((prev) => prev ?? null);
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === 'auth:result') setAuthenticated(Boolean(msg.data.success));
      if (msg.event === 'pong') { setLastPingTime(msg.data.timestamp); setLatency(Date.now() - msg.data.timestamp); }
      emit(msg.event, msg.data);
    };
    ws.onclose = () => { setConnected(false); setAuthenticated(false); setConnecting(false); };
    ws.onerror = () => setConnecting(false);
  };

  useEffect(() => { return () => wsRef.current?.close(); }, []);

  const send = <T extends keyof ClientEvents>(event: T, payload: ClientEvents[T]) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() }));
    else queueRef.current.push({ event, payload });
  };

  const on = <T extends keyof ServerEvents>(event: T, handler: Handler<ServerEvents[T]>) => {
    const set = listenersRef.current.get(event) ?? new Set();
    set.add(handler);
    listenersRef.current.set(event, set);
    return () => set.delete(handler);
  };

  const once = <T extends keyof ServerEvents>(event: T, handler: Handler<ServerEvents[T]>) => {
    const set = onceRef.current.get(event) ?? new Set();
    set.add(handler);
    onceRef.current.set(event, set);
  };

  const disconnect = () => wsRef.current?.close();
  const reconnect = () => { if (tokenRef.current) connect(tokenRef.current); };

  return useMemo(() => ({ connected, authenticated, connecting, send, on, once, connect, disconnect, reconnect, latency, lastPingTime }), [connected, authenticated, connecting, latency, lastPingTime]);
}
