import { StyleSheet, View } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

const AnimatedProgressbar = ({ progress }: { progress: number }) => {
  const progressBarBg = useThemeColor(
    { light: "#e0e0e0", dark: "#404040" },
    "background",
  );
  const progressFill = useThemeColor(
    { light: "#666666", dark: "#cccccc" },
    "text",
  );

  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withTiming(progress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    };
  });

  return (
    <View style={[styles.progressbar, { backgroundColor: progressBarBg }]}>
      <Animated.View
        style={[
          animatedStyle,
          { backgroundColor: progressFill },
          styles.progress,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  progressbar: {
    width: "100%",
    height: 20,
    marginTop: 10,
    borderRadius: 30,
    overflow: "hidden",
  },
  progress: {
    height: 20,
    borderRadius: 99,
  },
});

export default AnimatedProgressbar;
