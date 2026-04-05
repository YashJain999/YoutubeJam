package com.realtime.music_sync.controller;

import com.realtime.music_sync.model.SyncMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class MusicController {

    // Frontend publishes to /app/sync
    @MessageMapping("/sync")
    // Everyone subscribed to /topic/music receives this
    @SendTo("/topic/music")
    public SyncMessage relay(SyncMessage message) {
    	System.out.println("inside messege method and messege is: {}"+ message);
        // For now, just echo whatever the client sent
        return message;
    }
    
//    @EventListener
//    public void handleSessionConnected(SessionConnectEvent event) {
//        System.out.println("Client connected");
//    }
//    
//    @EventListener
//    public void handleSessionDisconnect(SessionDisconnectEvent event) {
//        System.out.println("Client disconnected");
//    }


    
//    @Override
//    public String toString() {
//        return "SyncMessage{" +
//                "action='" + action + '\'' +
//                ", timestamp=" + timestamp +
//                ", videoId='" + videoId + '\'' +
//                '}';
//    }
    
}
