import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

/**
 * ThemeInitializer ensures the persisted theme mode is applied globally
 * when the app starts, before any UI renders.
 */
export const ThemeInitializer = () => {
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem("themeMode");
        if (savedMode === "light" || savedMode === "dark") {
          Appearance.setColorScheme(savedMode);
        } else {
          Appearance.setColorScheme(null); // system default
        }
      } catch (error) {
        // On error, fallback to system default
        Appearance.setColorScheme(null);
        console.log("Failed to load theme mode:", error);
      }
    };
    loadThemeMode();
  }, []);
  return null;
};
