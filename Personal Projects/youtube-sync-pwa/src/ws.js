// src/ws.js
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

export function createStompClient({ url, onConnect, onMessage, onDisconnect }) {
  const client = new Client({
    // Create SockJS instance for Spring's SockJS endpoint
    webSocketFactory: () => new SockJS(url),
    reconnectDelay: 3000, // auto-reconnect every 3s
    onConnect: () => {
      console.log("client: ", client);
      
      if (onConnect) onConnect(client);
      // Subscribe to server broadcast topic
      client.subscribe('/topic/music', (msg) => {  //from where did this messege come?
        try {
          console.log(msg)
          const data = JSON.parse(msg.body);
          const customisedata = data + "hello";
          onMessage && onMessage(customisedata);
        } catch (e) {
          console.error('Invalid message payload:', msg.body);
        }
      });
    },
    onStompError: (frame) => {
      console.error('Broker error', frame.headers['message'], frame.body);
    },
    onWebSocketClose: () => {
      onDisconnect && onDisconnect();
    },
    debug: () => {
      // silence logs; add console.log here if you want verbose logs
    },
  });

  client.activate();
  return client;
}

export function publishSync(client, payload) {
  if (!client || !client.active) {
    console.warn("STOMP client is not connected. Message not published:", payload);
    // You could optionally queue the message here to send upon connection.
    return;
  }

  // Send to your @MessageMapping("/sync") → "/app/sync"
  client.publish({
    destination: '/app/sync',
    body: JSON.stringify(payload),
  });
}