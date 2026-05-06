import { useEffect, useMemo, useRef, useState } from 'react';

export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseWebSocketOptions {
  url: string;
  token: string;
  onMessage?: (message: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useWebSocket({ url, token, onMessage, onOpen, onClose }: UseWebSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WSStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);

  const connect = useMemo(() => () => {
    setStatus('connecting');
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus('connected');
      socket.send(JSON.stringify({ event: 'auth', data: { token }, timestamp: new Date().toISOString() }));
      onOpen?.();
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
        onMessage?.(message);
      } catch {
        setLastMessage(event.data);
      }
    };

    socket.onclose = () => {
      setStatus('disconnected');
      onClose?.();
    };

    socket.onerror = () => setStatus('error');
  }, [url, token, onMessage, onOpen, onClose]);

  useEffect(() => {
    connect();
    return () => socketRef.current?.close();
  }, [connect]);

  const send = (event: string, data: any) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event, data, timestamp: new Date().toISOString() }));
    }
  };

  return { status, lastMessage, send, reconnect: connect };
}
