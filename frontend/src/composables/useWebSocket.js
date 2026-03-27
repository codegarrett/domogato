import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
const WS_RECONNECT_BASE_MS = 1000;
const WS_RECONNECT_MAX_MS = 30000;
const WS_PING_INTERVAL_MS = 25000;
let socket = null;
let reconnectAttempt = 0;
let reconnectTimer = null;
let pingTimer = null;
const handlers = new Map();
const connected = ref(false);
const subscribedChannels = new Set();
function getWsUrl() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const { accessToken } = useAuth();
    const token = accessToken.value ?? '';
    return `${proto}//${host}/ws?token=${encodeURIComponent(token)}`;
}
function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }
    const url = getWsUrl();
    socket = new WebSocket(url);
    socket.onopen = () => {
        connected.value = true;
        reconnectAttempt = 0;
        for (const ch of subscribedChannels) {
            socket?.send(JSON.stringify({ action: 'subscribe', channel: ch }));
        }
        pingTimer = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ action: 'ping' }));
            }
        }, WS_PING_INTERVAL_MS);
    };
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const type = data.type;
            if (type === 'pong' || type === 'ping')
                return;
            const typeHandlers = handlers.get(type);
            if (typeHandlers) {
                for (const h of typeHandlers) {
                    try {
                        h(data);
                    }
                    catch { /* ignore */ }
                }
            }
            const allHandlers = handlers.get('*');
            if (allHandlers) {
                for (const h of allHandlers) {
                    try {
                        h(data);
                    }
                    catch { /* ignore */ }
                }
            }
        }
        catch { /* ignore */ }
    };
    socket.onclose = () => {
        connected.value = false;
        if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
        }
        scheduleReconnect();
    };
    socket.onerror = () => {
        socket?.close();
    };
}
function scheduleReconnect() {
    if (reconnectTimer)
        return;
    const delay = Math.min(WS_RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt), WS_RECONNECT_MAX_MS);
    reconnectAttempt++;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
    }, delay);
}
function disconnect() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
    }
    if (socket) {
        socket.onclose = null;
        socket.close();
        socket = null;
    }
    connected.value = false;
}
function subscribe(channel) {
    subscribedChannels.add(channel);
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'subscribe', channel }));
    }
}
function unsubscribe(channel) {
    subscribedChannels.delete(channel);
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'unsubscribe', channel }));
    }
}
function on(type, handler) {
    if (!handlers.has(type)) {
        handlers.set(type, new Set());
    }
    handlers.get(type).add(handler);
}
function off(type, handler) {
    handlers.get(type)?.delete(handler);
}
export function useWebSocket() {
    return {
        connected,
        connect,
        disconnect,
        subscribe,
        unsubscribe,
        on,
        off,
    };
}
