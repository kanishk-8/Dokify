import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemeToggler } from "@/components/ThemeToggler";
import { StyleSheet } from "react-native";

const SettingsPage = () => {
  return (
    <ThemedView style={style.container}>
      <ThemedText type="subtitle">Settings</ThemedText>
      <ThemedView>
        <ThemedText type="default" style={{ marginTop: 30 }}>
          Choose your preferred theme:
        </ThemedText>
        <ThemeToggler style={style.themeToggler} />
      </ThemedView>
    </ThemedView>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  themeToggler: {
    marginTop: 10,
  },
});

export default SettingsPage;
