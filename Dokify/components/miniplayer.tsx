import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSharedAudioPlayer } from "../context/audioprovider";
import { ThemedText } from "./ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";

export default function Player() {
  const router = useRouter();
  const { player, status } = useSharedAudioPlayer();

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: Colors.light.card, dark: Colors.dark.card },
    "background",
  );
  const textColor = useThemeColor(
    { light: Colors.dark.text, dark: Colors.light.text },
    "text",
  );
  const iconColor = useThemeColor(
    { light: Colors.dark.tint, dark: Colors.light.tint },
    "tint",
  );

  return (
    <View style={[styles.mini, { backgroundColor }]}>
      <TouchableOpacity
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        onPress={() => router.push("/(authenticated)/player")}
        activeOpacity={0.8}
      >
        <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
          Sample Audio Book
        </ThemedText>
        <TouchableOpacity
          onPress={() => {
            if (status.playing) {
              player.pause();
            } else {
              player.play();
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={status.playing ? "pause-circle" : "play-circle"}
            size={50}
            color={iconColor}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mini: {
    position: "absolute",
    bottom: 75,
    left: 10,
    right: 10,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  fullplayer: {
    flex: 1,
    paddingTop: 80,
  },
});
