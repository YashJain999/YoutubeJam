// src/App.jsx
import { useEffect, useRef, useState } from 'react';
import YouTubePlayer from './component/YouTubePlayer';
import { createStompClient, publishSync } from './ws';
import { Video, RotateCw, RotateCcw, Play, Pause } from "lucide-react";


const WS_URL = 'http://192.168.56.1:8080/music-sync'; // Spring Boot SockJS endpoint

function extractVideoId(input) {
  if (!input) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace('/', '');
    }
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    const parts = url.pathname.split('/');
    const idx = parts.indexOf('embed');
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // not a URL
  }
  return input;
}


// --- MAIN APP COMPONENT ---

export default function App() {
  // Refs
  const playerRef = useRef(null);
  const clientRef = useRef(null);
  const suppressNextEventRef = useRef(false);

  // State
  const [connected, setConnected] = useState(false);
  const [videoId, setVideoId] = useState("dQw4w9WgXcQ");
  const [input, setInput] = useState('');
  const [log, setLog] = useState([]);

  // Log management
  function appendLog(line) {
    setLog((prev) => [line, ...prev].slice(0, 50));
  }

  // --- WebSocket Setup ---
  useEffect(() => {
    // We wait briefly to ensure the CDN scripts are loaded before trying to create the client
    const   connectTimer = setTimeout(() => {
      const client = createStompClient({
        url: WS_URL,
        // Stomp.js doesn't have a deactivate. We'll use disconnect instead.
        onConnect: (c) => {
          c.connected = true; // Manually track connection state for publishSync
          setConnected(true);
        },
        onDisconnect: (c) => {
          if (c) c.connected = false;
          setConnected(false);
        },
        onMessage: handleIncoming,
      });
      clientRef.current = client;
    }, 100); // 100ms delay to help ensure scripts are parsed

    return () => {
      clearTimeout(connectTimer);
      if (clientRef.current && clientRef.current.connected) {
        // Stomp.js uses disconnect()
        // clientRef.current.disconnect(() => console.log("STOMP Disconnected."));
        // clientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle incoming broadcast messages from backend
  function handleIncoming(msg) {
    appendLog(`IN <- ${msg.action} ${msg.videoId ?? ''} @${msg.timestamp ?? ''}`);

    const p = playerRef.current;
    if (!p) return;

    // Apply remote action
    suppressNextEventRef.current = true;
    switch (msg.action) {
      case 'load':
        if (msg.videoId) {
          setVideoId(msg.videoId);
        }
        break;
      case 'play':
        if (Number.isFinite(msg.timestamp)) p.searchParamsekTo(msg.timestamp);
        p.play();
        break;
      case 'pause':
        if (Number.isFinite(msg.timestamp)) p.seekTo(msg.timestamp);
        p.pause();
        break;
      case 'seek':
        if (Number.isFinite(msg.timestamp)) p.seekTo(msg.timestamp);
        break;
      default:
        break;
    }
  }

  // --- Player Handlers ---
  function handleReady(_evt, api) {
    appendLog('Player ready');
  }

  // Player state changes -> broadcast to others
  function handleStateChange(evt, api) {
    const state = api.getPlayerState?.();
    const now = Math.round(api.getCurrentTime?.() ?? 0);

    // If we just applied a remote command, consume this event and reset the flag
    if (suppressNextEventRef.current) {
      suppressNextEventRef.current = false;
      return;
    }

    // Map YouTube state to actions
    let action = null;
    if (state === 1) action = 'play';
    else if (state === 2) action = 'pause';
    else if (state === 0) action = 'pause';
    else return;

    const payload = { action, videoId, timestamp: now };
    appendLog(`OUT -> ${action} ${videoId} @${now}`);
    // This call uses the FIX in publishSync, checking for client.connected
    if (clientRef.current) publishSync(clientRef.current, payload);
  }

  // --- Manual Controls (UI) ---
  const controlButtonClass = "p-3 flex items-center justify-center space-x-2 rounded-lg transition duration-200 shadow-md";

  function loadClicked() {
    const id = extractVideoId(input.trim());
    if (!id) return;
    setVideoId(id);

    const payload = { action: 'load', videoId: id, timestamp: 0 };
    appendLog(`OUT -> load ${id}`);
    if (clientRef.current) publishSync(clientRef.current, payload);
    setInput('');
  }

  function playClicked() {
    const p = playerRef.current;
    if (!p) return;
    const now = Math.round(p.getCurrentTime() ?? 0);
    p.play(); // Triggers local state change

    // Explicit publish for control buttons to ensure command is sent immediately
    const payload = { action: 'play', videoId, timestamp: now };
    appendLog(`OUT -> play ${videoId} @${now}`);
    if (clientRef.current) publishSync(clientRef.current, payload);
  }

  function pauseClicked() {
    const p = playerRef.current;
    if (!p) return;
    const now = Math.round(p.getCurrentTime() ?? 0);
    p.pause(); // Triggers local state change

    // Explicit publish for control buttons
    const payload = { action: 'pause', videoId, timestamp: now };
    appendLog(`OUT -> pause ${videoId} @${now}`);
    if (clientRef.current) publishSync(clientRef.current, payload);
  }

  function seekBy(delta) {
    const p = playerRef.current;
    if (!p) return;
    const now = p.getCurrentTime() ?? 0;
    const t = Math.max(0, Math.round(now + delta));
    p.seekTo(t);

    // Explicit publish for control buttons
    const payload = { action: 'seek', videoId, timestamp: t };
    appendLog(`OUT -> seek ${videoId} @${t}`);
    if (clientRef.current) publishSync(clientRef.current, payload);
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-8 font-inter">
      {/* Required for Tailwind CSS */}
      <script src="https://cdn.tailwindcss.com"></script>
      {/* FIX: Load SockJS and Stomp.js globally to resolve import errors */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.6.1/sockjs.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/stomp.js/2.3.3/stomp.min.js"></script>

      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 flex items-center">
          <Video className="w-8 h-8 mr-2 text-indigo-600 dark:text-indigo-400" /> YouTube Sync Client
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Real-time video synchronization via Spring Boot WebSocket/STOMP.</p>

        {/* Status */}
        <div className="mb-6 p-3 rounded-lg flex justify-between items-center text-sm font-medium border border-gray-200 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-300">WebSocket Status:</span>
          <span className={`px-3 py-1 rounded-full ${connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>

        {/* Load Video Controls */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Video URL or ID</label>
          <div className="flex space-x-2">
            <input
              placeholder="e.g., dQw4w9WgXcQ or https://youtu.be/..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={loadClicked}
              className={`${controlButtonClass} bg-indigo-600 hover:bg-indigo-700 text-white`}
              disabled={!connected || input.trim().length === 0}
            >
              Load
            </button>
          </div>
        </div>

        {/* YouTube Player */}
        <div className="mb-6">
          <YouTubePlayer
            ref={playerRef}
            videoId={videoId}
            onReady={handleReady}
            onPlayerStateChange={handleStateChange}
          />
        </div>

        {/* Player Controls */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => seekBy(-10)}
            className={`${controlButtonClass} bg-yellow-100 hover:bg-yellow-200 text-yellow-800`}
            disabled={!connected}
          >
            <RotateCcw className="w-5 h-5" />
            <span>-10s</span>
          </button>
          <button
            onClick={playClicked}
            className={`${controlButtonClass} bg-green-500 hover:bg-green-600 text-white`}
            disabled={!connected}
          >
            <Play className="w-6 h-6" />
            <span>Play</span>
          </button>
          <button
            onClick={pauseClicked}
            className={`${controlButtonClass} bg-red-500 hover:bg-red-600 text-white`}
            disabled={!connected}
          >
            <Pause className="w-6 h-6" />
            <span>Pause</span>
          </button>
          <button
            onClick={() => seekBy(+10)}
            className={`${controlButtonClass} bg-yellow-100 hover:bg-yellow-200 text-yellow-800`}
            disabled={!connected}
          >
            <span>+10s</span>
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {/* Log Window */}
        <div className="mt-4">
          <strong className="block text-lg font-semibold text-gray-900 dark:text-white mb-2">Event Log (Last 50)</strong>
          <pre className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4 rounded-lg text-xs overflow-auto h-48 text-gray-800 dark:text-gray-200">
            {log.map((l, i) => (
              <span key={i} className="block whitespace-pre-wrap">{`• ${l}`}</span>
            ))}
          </pre>
        </div>

      </div>
    </div>
  );
}
