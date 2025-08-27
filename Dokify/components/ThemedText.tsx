import { StyleSheet, Text, type TextProps } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "default"
    | "title"
    | "defaultSemiBold"
    | "subtitle"
    | "link"
    | "animeFont"
    | "buttonText"
    | "small";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");
  const buttonTextColor = useThemeColor(
    { light: "#FFFFFF", dark: "#000000" },
    "text",
  );

  return (
    <Text
      style={[
        { color: type === "buttonText" ? buttonTextColor : color },
        type === "default" ? styles.default : undefined,
        type === "title" ? styles.title : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "animeFont" ? styles.animeFont : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? styles.link : undefined,
        type === "buttonText" ? styles.buttonText : undefined,
        type === "small" ? styles.small : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    lineHeight: 48,
  },
  animeFont: {
    fontFamily: "animeFont",
    fontSize: 58,
    fontWeight: "normal",
    lineHeight: 56,
    textAlign: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  subtitle: {
    fontSize: 30,
    fontWeight: "bold",
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: "#0a7ea4",
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
  },
});
