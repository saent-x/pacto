import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

const AnimatedView = Animated.View;

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focus = useSharedValue(0);

  const lineStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      [Colors.dusk, Colors.primary],
    ),
    height: focus.value === 1 ? 2 : 1,
  }));

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithIcon : undefined]}
          placeholderTextColor={Colors.fog}
          selectionColor={Colors.primary}
          onFocus={(e) => {
            setIsFocused(true);
            focus.value = withTiming(1, { duration: 250 });
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            focus.value = withTiming(0, { duration: 250 });
            props.onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.iconRight}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      <AnimatedView style={[styles.line, error ? styles.lineError : undefined, !error ? lineStyle : undefined]} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  label: {
    ...Typography.overline,
    color: Colors.fog,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.md,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.bone,
    padding: 0,
  },
  inputWithIcon: {
    marginLeft: Spacing.md,
  },
  iconLeft: {},
  iconRight: {
    marginLeft: Spacing.sm,
  },
  line: {
    height: 1,
    backgroundColor: Colors.dusk,
  },
  lineError: {
    backgroundColor: Colors.error,
    height: 2,
  },
  error: {
    ...Typography.small,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
});
