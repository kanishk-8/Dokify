import React, { createContext, useContext, useEffect, useState } from "react";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";

// Define the context shape
type Audiobook = {
  id: string;
  title: string;
  author: string;
  duration: string;
  coverImage: string;
  description: string;
  audioUrl: string;
  bookmarked: boolean;
};

const AudioPlayerContext = createContext<{
  player: ReturnType<typeof useAudioPlayer>;
  status: ReturnType<typeof useAudioPlayerStatus>;
  audiourl: string | null;
  setAudiourl: React.Dispatch<React.SetStateAction<string | null>>;
  audiotitle: string | null;
  setAudiotitle: React.Dispatch<React.SetStateAction<string | null>>;
  currentBook: Audiobook | null;
  setCurrentBook: React.Dispatch<React.SetStateAction<Audiobook | null>>;
} | null>(null);

export function AudioPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [audiourl, setAudiourl] = useState<string | null>(null);
  const [audiotitle, setAudiotitle] = useState<string | null>(null);
  const [currentBook, setCurrentBook] = useState<Audiobook | null>(null);
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
      value={{
        player,
        status,
        audiourl,
        setAudiourl,
        audiotitle,
        setAudiotitle,
        currentBook,
        setCurrentBook,
      }}
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
