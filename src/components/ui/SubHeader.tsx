import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Icon } from './Icon';
import { PressScale } from './PressScale';
import { useTheme } from '@/src/lib/theme';

export function SubHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}) {
  const { C, F } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
        <PressScale
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          hitSlop={6}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: C.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="chevronLeft" size={18} color={C.bone} />
        </PressScale>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 10,
              color: C.fog,
              fontFamily: F.bodyBold,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Text>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 24,
              color: C.bone,
              letterSpacing: 0,
              lineHeight: 26,
            }}
          >
            {title}
          </Text>
        </View>
      </View>
      {right}
    </View>
  );
}
