import { StyleProp, ViewStyle } from 'react-native';
import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { useAssistantOverlay } from '@/src/lib/assistant-overlay';
import { PressScale } from '../PressScale';
import { PactoMark } from './PactoMark';

const TAP_SOUND = require('../../../../assets/sounds/ai-tap.wav');

type Props = {
  size?: number;
  markSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function HeroPactoBadge({ size = 38, markSize = 38, style }: Props) {
  const { openVoiceOverlay } = useAssistantOverlay();
  const tapPlayer = useAudioPlayer(TAP_SOUND);

  const handlePress = useCallback(() => {
    try {
      tapPlayer.seekTo(0).catch(() => undefined);
      tapPlayer.play();
    } catch {
      // Sound is extra feedback only; the AI overlay should still open.
    }
    openVoiceOverlay();
  }, [openVoiceOverlay, tapPlayer]);

  return (
    <PressScale
      testID="pacto-ai-trigger"
      accessibilityRole="button"
      accessibilityLabel="Open Pacto AI"
      haptic="impactMedium"
      hitSlop={10}
      onPress={handlePress}
      pressedScale={0.82}
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <PactoMark size={markSize} />
    </PressScale>
  );
}
