import { StyleSheet, TouchableOpacity, View, Image } from "react-native";
import { useSharedAudioPlayer } from "../context/audioprovider";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import TextTicker from "react-native-text-ticker";
import { useRef } from "react";

// Removed getAudioTitle helper, will use audiotitle from context

export default function Player() {
  const router = useRouter();
  const { player, status, audiotitle, currentBook } = useSharedAudioPlayer();
  const playerOpenedRef = useRef(false);

  const handleOpenPlayer = () => {
    if (!playerOpenedRef.current) {
      playerOpenedRef.current = true;
      router.push("/(authenticated)/player");
      setTimeout(() => {
        playerOpenedRef.current = false;
      }, 1000);
    }
  };

  // Hide miniplayer if no audio is loaded

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

  // Use currentBook from context if available
  const audioTitle = currentBook?.title || audiotitle || "No Audio Playing";
  const coverImageSource = {
    uri: currentBook?.coverImage || "https://placehold.co/80x100",
  };

  return (
    <View style={[styles.mini, { backgroundColor }]}>
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
        onPress={handleOpenPlayer}
        activeOpacity={0.8}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          <Image
            source={coverImageSource}
            style={styles.miniCoverImage}
            resizeMode="cover"
          />
          <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
            <TextTicker
              style={{
                color: textColor,
                fontWeight: "bold",
                width: "100%",
              }}
              duration={12000}
              loop
              bounce={false}
              repeatSpacer={50}
              marqueeDelay={1000}
              numberOfLines={1}
            >
              {audioTitle}
            </TextTicker>
          </View>
        </View>
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
  miniCoverImage: {
    aspectRatio: 0.8,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
});
