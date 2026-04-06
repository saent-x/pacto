/**
 * Real scannable QR code using react-native-qrcode-svg.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCodeSVG from 'react-native-qrcode-svg';

interface QRCodeProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
}

export function QRCode({ value, size = 200, fgColor = '#000', bgColor = '#fff' }: QRCodeProps) {
  return (
    <View style={[styles.container, { width: size + 24, height: size + 24 }]}>
      <QRCodeSVG
        value={value}
        size={size}
        color={fgColor}
        backgroundColor={bgColor}
        ecl="M"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
