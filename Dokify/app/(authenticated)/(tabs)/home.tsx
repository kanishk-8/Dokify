import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useSharedAudioPlayer } from "@/context/audioprovider";
import {
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";

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

// const audiobooksData: Audiobook[] = audiodata as Audiobook[];

const Index = () => {
  const router = useRouter();
  const [audioBooks, setAudioBooks] = useState<Audiobook[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bookBgColor = useThemeColor(
    { light: "#000000", dark: "#ffffff" },
    "background",
  );
  const iconColor = useThemeColor({ light: "#fff", dark: "#000" }, "text");
  const { setAudiourl, audiourl, player, status, setAudiotitle } =
    useSharedAudioPlayer();
  const [requestedUrl, setRequestedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (
      requestedUrl &&
      status?.isLoaded &&
      // FIX: Remove status.audioUrl (diagnostic error: Property 'audioUrl' does not exist on type 'AudioStatus')
      !status?.playing
    ) {
      player.play();
      setRequestedUrl(null); // Reset after playing
    }
  }, [requestedUrl, status, player]);

  // Fetch audiobooks from backend API
  const fetchAudioBooks = () => {
    setLoading(true);
    setError(null);
    fetch("http://192.168.1.11:8000/getAudioBooks/", {
      method: "POST",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch audiobooks");
        }
        return res.json();
      })
      .then((data) => {
        setAudioBooks(data.audiobooks || []);
        setError(null);
      })
      .catch((err) => {
        setError("Unable to fetch audiobooks. Please try again.");
        setAudioBooks([]);
        console.error("Failed to fetch audiobooks:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAudioBooks();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={audioBooks}
        keyExtractor={(book) => book.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          audioBooks.length > 0 ? (
            <ThemedText type="subtitle" style={{ marginBottom: 30 }}>
              Audio Books:
            </ThemedText>
          ) : null
        }
        ListEmptyComponent={
          <ThemedView style={styles.noAudioBooks}>
            {error ? (
              <>
                <ThemedText type="subtitle" style={{ color: "#ff4444" }}>
                  {error}
                </ThemedText>
                <ThemedButton
                  title={loading ? "Refreshing..." : "Refresh"}
                  variant="primary"
                  size="small"
                  onPress={fetchAudioBooks}
                  disabled={loading}
                />
              </>
            ) : (
              <>
                <ThemedText type="subtitle">No Audio Books Found</ThemedText>
                <ThemedText type="defaultSemiBold">
                  Get Started by creating one!
                </ThemedText>
                <ThemedButton
                  title="Create Audio Book"
                  variant="primary"
                  size="small"
                  onPress={() =>
                    router.push("/(authenticated)/(tabs)/generate")
                  }
                />
              </>
            )}
          </ThemedView>
        }
        contentContainerStyle={
          audioBooks.length === 0
            ? { flex: 1, justifyContent: "center", alignItems: "center" }
            : { paddingBottom: 70 }
        }
        renderItem={({ item: book }) => {
          const isCurrentBook = audiourl === book.audioUrl;
          const isPlaying = isCurrentBook && status?.playing;

          return (
            <ThemedView
              style={[styles.bookcontainer, { backgroundColor: bookBgColor }]}
            >
              <MaterialIcons
                style={styles.bookmarkicon}
                name={book.bookmarked ? "bookmark" : "bookmark-border"}
                size={24}
                color={iconColor}
              />
              <TouchableOpacity
                style={styles.playIcon}
                onPress={() => {
                  if (!isCurrentBook) {
                    setAudiourl(book.audioUrl);
                    setAudiotitle(book.title);
                    setRequestedUrl(book.audioUrl);
                  } else {
                    if (isPlaying) {
                      player.pause();
                    } else {
                      player.play();
                    }
                  }
                }}
              >
                <Ionicons
                  name={isPlaying ? "pause-circle" : "play-circle"}
                  size={40}
                  color={iconColor}
                />
              </TouchableOpacity>
              <View style={styles.bookRow}>
                <View style={{ alignItems: "center" }}>
                  <Image
                    style={styles.coverImage}
                    source={{
                      uri: book.coverImage,
                    }}
                  />
                  <ThemedText
                    type="buttonText"
                    style={{
                      fontSize: 12,
                      marginTop: 6,
                      textAlign: "center",
                    }}
                  >
                    {book.duration}
                  </ThemedText>
                </View>
                <View style={styles.infoContainer}>
                  <ThemedText
                    type="buttonText"
                    numberOfLines={1}
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    {book.title}
                  </ThemedText>
                  <View
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: "#eee",
                      marginVertical: 6,
                    }}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <ThemedText
                      type="buttonText"
                      style={{
                        fontSize: 14,
                        marginBottom: 6,
                        flex: 1,
                      }}
                      numberOfLines={2}
                    >
                      {book.description}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="buttonText"
                    style={{
                      fontSize: 14,
                      marginTop: 6,
                      fontStyle: "italic",
                    }}
                  >
                    ~ {book.author}
                  </ThemedText>
                </View>
              </View>
            </ThemedView>
          );
        }}
        refreshing={loading}
        onRefresh={fetchAudioBooks}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  noAudioBooks: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  bookmarkicon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
  },
  bookcontainer: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 15,
    // backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  coverImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    marginRight: 14,
    backgroundColor: "#eee",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "flex-start",
    gap: 2,
    paddingRight: 20,
  },
  playIcon: {
    position: "absolute",
    bottom: 10,
    right: 10,
    zIndex: 2,
  },
});

export default Index;
