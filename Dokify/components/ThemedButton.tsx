import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  TouchableOpacityProps,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Colors } from "@/constants/Colors";

export type ThemedButtonProps = TouchableOpacityProps & {
  title: string;
  icon?: React.ReactNode;
  lightColor?: string;
  darkColor?: string;
  textLightColor?: string;
  textDarkColor?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "opposite";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
};

export function ThemedButton({
  title,
  icon,
  style,
  lightColor,
  darkColor,
  textLightColor,
  textDarkColor,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  disabled = false,
  ...rest
}: ThemedButtonProps) {
  // Default colors based on variant using monochrome theme
  const getDefaultColors = () => {
    switch (variant) {
      case "primary":
        return {
          light: lightColor || Colors.light.tint, // #000
          dark: darkColor || Colors.dark.tint, // #fff
          textLight: textLightColor || Colors.light.background, // #fff
          textDark: textDarkColor || Colors.dark.background, // #151718
        };
      case "secondary":
        return {
          light: lightColor || Colors.light.icon, // #687076
          dark: darkColor || Colors.dark.icon, // #9BA1A6
          textLight: textLightColor || Colors.light.background, // #fff
          textDark: textDarkColor || Colors.dark.text, // #ECEDEE
        };
      case "outline":
        return {
          light: lightColor || "transparent",
          dark: darkColor || "transparent",
          textLight: textLightColor || Colors.light.text, // #11181C
          textDark: textDarkColor || Colors.dark.text, // #ECEDEE
        };
      case "ghost":
        return {
          light: lightColor || "transparent",
          dark: darkColor || "transparent",
          textLight: textLightColor || Colors.light.text, // #11181C
          textDark: textDarkColor || Colors.dark.text, // #ECEDEE
        };
      case "opposite":
        return {
          light: lightColor || "#fff",
          dark: darkColor || "#000",
          textLight: textLightColor || "#000",
          textDark: textDarkColor || "#fff",
        };
      default:
        return {
          light: lightColor || Colors.light.tint, // #000
          dark: darkColor || Colors.dark.tint, // #fff
          textLight: textLightColor || Colors.light.background, // #fff
          textDark: textDarkColor || Colors.dark.background, // #151718
        };
    }
  };

  const colors = getDefaultColors();
  const backgroundColor = useThemeColor(
    { light: colors.light, dark: colors.dark },
    "background",
  );
  const textColor = useThemeColor(
    { light: colors.textLight, dark: colors.textDark },
    "text",
  );
  const borderColor = useThemeColor(
    { light: colors.textLight, dark: colors.textDark },
    "text",
  );

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return styles.small;
      case "large":
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "outline":
        return [styles.outline, { borderColor }];
      case "ghost":
        return styles.ghost;
      default:
        return {};
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        getSizeStyles(),
        getVariantStyles(),
        { backgroundColor },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled}
      activeOpacity={0.8}
      {...rest}
    >
      {icon && <>{icon}</>}
      <ThemedText
        style={[
          styles.text,
          { color: textColor },
          disabled && styles.disabledText,
        ]}
        type="buttonText"
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
  },
  outline: {
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    textAlign: "center",
  },
  disabledText: {
    opacity: 0.7,
  },
});
