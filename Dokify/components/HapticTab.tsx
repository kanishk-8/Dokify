import { Pressable, PressableProps } from "react-native";
import * as Haptics from "expo-haptics";

export function HapticTab(props: PressableProps) {
  return (
    <Pressable
      {...props}
      android_ripple={null} // This disables ripple on Android
      style={props.style}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
