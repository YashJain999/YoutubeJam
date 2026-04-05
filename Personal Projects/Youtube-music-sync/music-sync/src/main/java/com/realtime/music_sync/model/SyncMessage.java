package com.realtime.music_sync.model;

public class SyncMessage {
    private String action;   // e.g., "play", "pause", "seek", "load"
    private String videoId;  // YouTube video ID
    private int timestamp;   // seconds position (for seek/sync)

    public SyncMessage() {}

    public SyncMessage(String action, String videoId, int timestamp) {
        this.action = action;
        this.videoId = videoId;
        this.timestamp = timestamp;
    }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getVideoId() { return videoId; }
    public void setVideoId(String videoId) { this.videoId = videoId; }

    public int getTimestamp() { return timestamp; }
    public void setTimestamp(int timestamp) { this.timestamp = timestamp; }
}
