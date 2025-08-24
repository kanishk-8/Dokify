import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { StyleSheet, TouchableOpacity, Appearance } from "react-native";
import { useState, useEffect, useCallback } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColor } from "@/hooks/useThemeColor";

type ThemeMode = "light" | "dark" | "system";

interface ThemeTogglerProps {
  style?: any;
}

export const ThemeToggler = ({ style }: ThemeTogglerProps) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  // Animation values using Reanimated
  const lightScale = useSharedValue(0.9);
  const darkScale = useSharedValue(0.9);
  const systemScale = useSharedValue(1);

  const borderColor = useThemeColor({}, "text");
  const activeBackgroundColor = useThemeColor({}, "text");
  const inactiveBackgroundColor = useThemeColor({}, "background");

  const animateSelection = useCallback(
    (selectedMode: ThemeMode) => {
      // Reset all scales with spring animation
      lightScale.value = withSpring(selectedMode === "light" ? 1 : 0.9, {
        damping: 15,
        stiffness: 300,
      });
      darkScale.value = withSpring(selectedMode === "dark" ? 1 : 0.9, {
        damping: 15,
        stiffness: 300,
      });
      systemScale.value = withSpring(selectedMode === "system" ? 1 : 0.9, {
        damping: 15,
        stiffness: 300,
      });
    },
    [lightScale, darkScale, systemScale],
  );

  const applyTheme = (mode: ThemeMode) => {
    if (mode === "system") {
      Appearance.setColorScheme(null); // Follow system
    } else {
      Appearance.setColorScheme(mode);
    }
  };

  const loadThemeMode = useCallback(async () => {
    try {
      const savedMode = (await AsyncStorage.getItem("themeMode")) as ThemeMode;
      if (savedMode) {
        setThemeMode(savedMode);
        applyTheme(savedMode);
        animateSelection(savedMode);
      } else {
        // No saved preference, use system default
        setThemeMode("system");
        applyTheme("system");
        animateSelection("system");
      }
    } catch (error) {
      console.error("Error loading theme mode:", error);
      // On error, also default to system
      setThemeMode("system");
      applyTheme("system");
      animateSelection("system");
    }
  }, [animateSelection]);

  useEffect(() => {
    loadThemeMode();
  }, [loadThemeMode]);

  const saveThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem("themeMode", mode);
    } catch (error) {
      console.error("Error saving theme mode:", error);
    }
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    applyTheme(mode);
    saveThemeMode(mode);
    animateSelection(mode);
  };

  const lightAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lightScale.value }],
  }));

  const darkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: darkScale.value }],
  }));

  const systemAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: systemScale.value }],
  }));

  return (
    <ThemedView style={[styles.container, style]}>
      <Animated.View style={lightAnimatedStyle}>
        <TouchableOpacity
          style={[
            styles.pill,
            themeMode === "light"
              ? [
                  styles.selectedPill,
                  { backgroundColor: activeBackgroundColor },
                ]
              : [styles.unselectedPill, { borderColor }],
          ]}
          onPress={() => setTheme("light")}
        >
          <ThemedText
            style={[
              styles.pillText,
              themeMode === "light" && { color: inactiveBackgroundColor },
            ]}
          >
            Light
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={darkAnimatedStyle}>
        <TouchableOpacity
          style={[
            styles.pill,
            themeMode === "dark"
              ? [
                  styles.selectedPill,
                  { backgroundColor: activeBackgroundColor },
                ]
              : [styles.unselectedPill, { borderColor }],
          ]}
          onPress={() => setTheme("dark")}
        >
          <ThemedText
            style={[
              styles.pillText,
              themeMode === "dark" && { color: inactiveBackgroundColor },
            ]}
          >
            Dark
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={systemAnimatedStyle}>
        <TouchableOpacity
          style={[
            styles.pill,
            themeMode === "system"
              ? [
                  styles.selectedPill,
                  { backgroundColor: activeBackgroundColor },
                ]
              : [styles.unselectedPill, { borderColor }],
          ]}
          onPress={() => setTheme("system")}
        >
          <ThemedText
            style={[
              styles.pillText,
              themeMode === "system" && { color: inactiveBackgroundColor },
            ]}
          >
            System
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  pill: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  selectedPill: {
    borderRadius: 25,
  },
  unselectedPill: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
