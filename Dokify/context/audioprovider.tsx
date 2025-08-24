import React, { createContext, useContext, useEffect } from "react";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";

// Define the context shape
const AudioPlayerContext = createContext<{
  player: ReturnType<typeof useAudioPlayer>;
  status: ReturnType<typeof useAudioPlayerStatus>;
} | null>(null);

export function AudioPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const player = useAudioPlayer({
    uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    (async () => {
      await setAudioModeAsync({ playsInSilentMode: true });
    })();
  }, []);

  return (
    <AudioPlayerContext.Provider value={{ player, status }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

// Custom hook for easy access
export function useSharedAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error(
      "useSharedAudioPlayer must be used within AudioPlayerProvider",
    );
  }
  return context;
}
