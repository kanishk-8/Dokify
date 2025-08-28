import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
import { useSharedAudioPlayer } from "@/context/audioprovider";
import { useThemeColor } from "@/hooks/useThemeColor";

const BookDetails = () => {
  const { currentBook, setAudiourl, setAudiotitle } = useSharedAudioPlayer();

  const iconColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const backendUrl = process.env.EXPO_PUBLIC_BACKENDURL;

  return (
    <ThemedView style={styles.container}>
      <Image
        style={styles.coverImage}
        source={{
          uri: currentBook?.coverImage || "https://placehold.co/300x300",
        }}
      />
      <ThemedText type="title" style={{ marginBottom: 8 }}>
        {currentBook?.title || "No Audio Playing"}
      </ThemedText>
      <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>
        {currentBook?.author}
      </ThemedText>
      <ThemedText type="default" style={{ marginBottom: 12 }}>
        {currentBook?.description}
      </ThemedText>

      {/* Chapters List */}
      {currentBook?.chapters && currentBook.chapters.length > 0 && (
        <View style={styles.chaptersContainer}>
          <ThemedText type="subtitle" style={{ marginVertical: 10 }}>
            Chapters
          </ThemedText>
          <FlatList
            data={currentBook.chapters}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={({ item: chapter, index }) => (
              <View style={styles.chapterRow}>
                <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
                  {chapter.title} ({chapter.duration})
                </ThemedText>
                <TouchableOpacity
                  style={styles.playChapterButton}
                  onPress={() => {
                    setAudiourl(`${backendUrl}/audiobook/${chapter.audioUrl}`);
                    setAudiotitle(
                      `${currentBook.title} - Chapter ${index + 1}`,
                    );
                  }}
                >
                  <Ionicons name="play-circle" size={36} color={iconColor} />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 16,
    paddingTop: 60,
  },
  coverImage: {
    width: 180,
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  chaptersContainer: {
    width: "100%",
    marginTop: 24,
  },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  playChapterButton: {
    marginLeft: 12,
  },
});

export default BookDetails;
