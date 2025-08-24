import React, { createContext, useContext, useEffect, useState } from "react";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";

// Define the context shape
const AudioPlayerContext = createContext<{
  player: ReturnType<typeof useAudioPlayer>;
  status: ReturnType<typeof useAudioPlayerStatus>;
  audiourl: string | null;
  setAudiourl: React.Dispatch<React.SetStateAction<string | null>>;
} | null>(null);

export function AudioPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [audiourl, setAudiourl] = useState<string | null>(null);
  const player = useAudioPlayer({
    uri: audiourl ?? undefined,
  });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    (async () => {
      await setAudioModeAsync({ playsInSilentMode: true });
    })();
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{ player, status, audiourl, setAudiourl }}
    >
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
