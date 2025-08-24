import { StyleSheet } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import { useSharedAudioPlayer } from "@/context/audioprovider";

export default function Player() {
  const { player, status, audiotitle } = useSharedAudioPlayer();

  return (
    <ThemedView style={styles.full}>
      <ThemedText type="title">{audiotitle || "No Audio Playing"}</ThemedText>
      <ThemedText type="subtitle">
        {status.currentTime.toFixed(0)}s / {status.duration.toFixed(0)}s
      </ThemedText>
      <ThemedButton
        title={status.playing ? "Pause" : "Play"}
        onPress={() => (status.playing ? player.pause() : player.play())}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },
});
