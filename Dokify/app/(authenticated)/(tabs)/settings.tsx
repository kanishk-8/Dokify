import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemeToggler } from "@/components/ThemeToggler";
import { StyleSheet } from "react-native";
import { ThemedButton } from "@/components/ThemedButton";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

const SettingsPage = () => {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <ThemedView style={style.container}>
      <ThemedText type="subtitle">Settings</ThemedText>
      <ThemedView>
        <ThemedText type="default" style={{ marginTop: 30 }}>
          Choose your preferred theme:
        </ThemedText>
        <ThemeToggler style={style.themeToggler} />
      </ThemedView>
      <ThemedButton
        title="Logout"
        onPress={handleLogout}
        variant="primary"
        size="medium"
        fullWidth
        style={{ marginTop: 40 }}
      />
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
