import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, FlatList, Image, View } from "react-native";
import audiodata from "../../../assets/audiobooks.json";
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

const audiobooksData: Audiobook[] = audiodata as Audiobook[];

const Index = () => {
  const router = useRouter();
  const [audioBooks, setAudioBooks] = useState<Audiobook[]>([]);
  const bookBgColor = useThemeColor(
    { light: "#000", dark: "#fff" },
    "background",
  );
  const iconColor = useThemeColor({ light: "#fff", dark: "#000" }, "text");

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
            <ThemedText type="subtitle">No Audio Books Found</ThemedText>
            <ThemedText type="defaultSemiBold">
              Get Started by creating one!
            </ThemedText>
            <ThemedButton
              title="Create Audio Book"
              variant="primary"
              size="small"
              onPress={() => router.push("/(authenticated)/(tabs)/generate")}
            />
            <ThemedButton
              title="Load Test Data"
              variant="primary"
              size="small"
              onPress={() => setAudioBooks(audiobooksData)}
            />
          </ThemedView>
        }
        contentContainerStyle={
          audioBooks.length === 0
            ? { flex: 1, justifyContent: "center", alignItems: "center" }
            : { paddingBottom: 70 }
        }
        renderItem={({ item: book }) => (
          <ThemedView
            style={[styles.bookcontainer, { backgroundColor: bookBgColor }]}
          >
            <MaterialIcons
              style={styles.bookmarkicon}
              name={book.bookmarked ? "bookmark-add" : "bookmark-added"}
              size={24}
              color={iconColor}
            />
            <Ionicons
              name="play-circle"
              size={40}
              color={iconColor}
              style={styles.playIcon}
            />
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
                  style={{ fontSize: 18, fontWeight: "bold", marginBottom: 4 }}
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
        )}
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
