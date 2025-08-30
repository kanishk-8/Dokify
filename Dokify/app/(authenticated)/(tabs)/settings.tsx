import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemeToggler } from "@/components/ThemeToggler";
import { StyleSheet, Image, View } from "react-native";
import { ThemedButton } from "@/components/ThemedButton";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useThemeColor } from "@/hooks/useThemeColor";

const SettingsPage = () => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  // Audiobook credits state
  const [credits, setCredits] = useState<number>(0);

  // Credits section: guidelines style colors
  const sectionBgColor = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background",
  );
  const sectionBorderColor = useThemeColor(
    { light: "#e0e4ea", dark: "#fff" },
    "background",
  );
  const sectionTextColor = useThemeColor(
    { light: "#222", dark: "#fff" },
    "text",
  );

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  const handleAddCredits = () => {
    setCredits((prev) => prev + 10); // Add 10 dummy credits
  };

  return (
    <ThemedView style={style.container}>
      {/*<ThemedText type="subtitle">Settings</ThemedText>*/}
      <View style={style.profileRow}>
        {user?.imageUrl && (
          <Image source={{ uri: user.imageUrl }} style={style.profileImage} />
        )}
        <View style={style.profileInfo}>
          {user?.fullName && (
            <ThemedText type="title">{user.fullName}</ThemedText>
          )}
          {user?.primaryEmailAddress?.emailAddress && (
            <ThemedText type="default" style={style.profileEmail}>
              {user.primaryEmailAddress.emailAddress}
            </ThemedText>
          )}
        </View>
      </View>
      {/* Audiobook Credits Section - styled like profile container */}
      <ThemedView
        style={[
          style.creditsSection,
          {
            backgroundColor: sectionBgColor,
            borderColor: sectionBorderColor,
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            marginTop: 20,
            marginBottom: 18,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 2,
            elevation: 1,
          },
        ]}
      >
        <ThemedText
          type="defaultSemiBold"
          style={[style.creditsSectionTitle, { color: sectionTextColor }]}
        >
          Audiobook Credits
        </ThemedText>
        <ThemedText
          type="title"
          style={[style.creditsAmount, { color: sectionTextColor }]}
        >
          ₹ {credits}
        </ThemedText>
        <ThemedButton
          title="Add ₹10 Credits"
          onPress={handleAddCredits}
          size="medium"
          variant="primary"
          fullWidth
          style={[style.creditsButton]}
        />
        <ThemedText
          type="default"
          style={[style.creditsInfo, { fontStyle: "italic", opacity: 0.7 }]}
        >
          Credits are used to generate audiobooks. Add more credits to continue
          creating new audiobooks.
        </ThemedText>
      </ThemedView>
      <ThemedView>
        <ThemedText
          type="defaultSemiBold"
          style={{ marginTop: 30, fontSize: 26 }}
        >
          Theme
        </ThemedText>
        <ThemeToggler style={style.themeToggler} />
      </ThemedView>
      <ThemedButton
        title="Logout"
        onPress={handleLogout}
        variant="primary"
        size="medium"
        fullWidth
        style={{ marginTop: 20, marginBottom: 20 }}
      />
    </ThemedView>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 30,
  },
  profileInfo: {
    marginLeft: 22,
    justifyContent: "center",
  },
  profileEmail: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  themeToggler: {
    marginTop: 10,
  },
  creditsSection: {
    marginTop: 20,
    marginBottom: 10,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  creditsSectionTitle: {
    fontSize: 26,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "left",
    marginLeft: 2,
  },

  creditsAmount: {
    fontSize: 22,
    fontWeight: "bold",
    marginRight: 8,
  },
  creditsButton: {
    borderRadius: 10,
    marginTop: 14,
    marginBottom: 8,
    width: "100%",
    alignSelf: "center",
  },
  creditsInfo: {
    fontSize: 15,
    textAlign: "left",
    marginTop: 8,
    opacity: 0.8,
    marginLeft: 2,
  },
});

export default SettingsPage;
