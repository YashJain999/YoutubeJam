import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

// Expose imperative methods to parent via ref
const YouTubePlayer = forwardRef(({ videoId, onReady, onPlayerStateChange }, ref) => {
  const playerRef = useRef(null);
  const containerIdRef = useRef(`ytp-${Math.random().toString(36).slice(2)}`);

  // Load IFrame API once
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      createPlayer();
    };

    // cleanup (rarely needed)
    return () => {
      delete window.onYouTubeIframeAPIReady;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create/attach the player
  function createPlayer() {
    if (playerRef.current) return;
    playerRef.current = new window.YT.Player(containerIdRef.current, {
      height: '240',
      width: '420',
      videoId,
      playerVars: {
        // modestbranding: 1, // optional
        // controls: 1,
      },
      events: {
        onReady: (e) => onReady && onReady(e, playerApi()),
        onStateChange: (e) => onPlayerStateChange && onPlayerStateChange(e, playerApi()),
      },
    });
  }

  // Load new video when videoId changes
  useEffect(() => {
    if (playerRef.current && videoId) {
      playerRef.current.loadVideoById(videoId);
    }
  }, [videoId]);

  // Helper to expose a small safe API to parent
  function playerApi() {
    const p = playerRef.current;
    return p
      ? {
          getCurrentTime: () => p.getCurrentTime(),
          getPlayerState: () => p.getPlayerState(), // 1=PLAYING,2=PAUSED,0=ENDED,5=Cued
          play: () => p.playVideo(),
          pause: () => p.pauseVideo(),
          seekTo: (seconds) => p.seekTo(seconds, true),
          load: (id) => p.loadVideoById(id),
        }
      : null;
  }

  useImperativeHandle(ref, () => ({
    play: () => playerApi()?.play(),
    pause: () => playerApi()?.pause(),
    seekTo: (s) => playerApi()?.seekTo(s),
    load: (id) => playerApi()?.load(id),
    getCurrentTime: () => playerApi()?.getCurrentTime() ?? 0,
    getPlayerState: () => playerApi()?.getPlayerState() ?? -1,
  }));

  return <div id={containerIdRef.current} />;
});

export default YouTubePlayer;
