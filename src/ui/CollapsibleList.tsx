import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors } from '../theme';
import { T, Mono } from './Text';
import { Icon } from './Icon';
import { Press } from './Press';

// "Show N more / Show less" toggle — the agenda control from the Today screen, shared.
export function ShowMore({ expanded, hidden, onToggle }: { expanded: boolean; hidden: number; onToggle: () => void }) {
  const C = useColors();
  return (
    <Press onPress={onToggle} haptic style={{ alignSelf: 'flex-start', paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {expanded ? (
          <T size={14} weight={600} color={C.accent}>
            Show less
          </T>
        ) : (
          <>
            <T size={14} weight={600} color={C.accent}>
              Show
            </T>
            <Mono size={14} weight={600} color={C.accent}>
              {hidden}
            </Mono>
            <T size={14} weight={600} color={C.accent}>
              more
            </T>
          </>
        )}
        <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={14} color={C.accent} strokeWidth={2.4} />
      </View>
    </Press>
  );
}

/**
 * Renders up to `limit` items; any beyond collapse behind a "Show N more / Show less"
 * toggle. Drop-in for an inline `.map` — pass the full array and a render function:
 *
 *   <CollapsibleList items={rows} limit={5}>
 *     {(row, i) => <Row key={row.id} first={i === 0} {...row} />}
 *   </CollapsibleList>
 */
export function CollapsibleList<Item>({
  items,
  limit = 5,
  children,
}: {
  items: Item[];
  limit?: number;
  children: (item: Item, index: number) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, limit);
  const hidden = items.length - limit;
  return (
    <>
      {shown.map((item, i) =>
        // Rows within `limit` reconcile untouched; only the revealed tail cascades in.
        i < limit ? (
          children(item, i)
        ) : (
          <Animated.View
            key={`reveal-${i}`}
            entering={FadeInDown.duration(220)
              .delay(Math.min(i - limit, 8) * 25)
              .withInitialValues({ transform: [{ translateY: 8 }] })}
          >
            {children(item, i)}
          </Animated.View>
        ),
      )}
      {hidden > 0 && <ShowMore expanded={expanded} hidden={hidden} onToggle={() => setExpanded((v) => !v)} />}
    </>
  );
}
