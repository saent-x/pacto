import React from 'react';
import { router } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { format } from 'date-fns';
import {
  CardHalo,
  ColorTile,
  MonthlyHeatmap,
  type Tone,
} from '@/src/components/ui/pacto';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { routeForTimelineItem } from '@/src/lib/homeNavigation';
import type { TimelineItem } from '@/src/lib/home/types';
import type { ActivityHeatmapDay } from '@/src/lib/home/activity';
import { alphaColor } from '@/src/lib/color';
import { useTheme } from '@/src/lib/theme';
import type { FeatureId } from '@/src/lib/features/registry';
import type { WeatherStatus } from '@/src/hooks/useWeatherStatus';

type ThemeColors = ReturnType<typeof useTheme>['C'];

const pointerEventsNoneProps = Platform.OS === 'web' ? {} : { pointerEvents: 'none' as const };

interface HomeChrome {
  heroBg: string;
  heroBorder: string;
  sideBg: string;
  sideBorder: string;
  sideInk: string;
  sideMuted: string;
  sideIconBg: string;
  activityPalette: [string, string, string, string];
}

interface Shortcut {
  icon: IconName;
  label: string;
  route: string;
  feature: FeatureId;
  description: string;
}

interface Mood {
  id: string;
  label: string;
  icon: IconName;
}

export interface HomeHeroGridProps {
  C: ThemeColors;
  homeQuietHalo: string;
  homeChrome: HomeChrome;
  homeSideOrb: string;
  homePanelBg: string;
  homePanelBorder: string;
  homeHeroInk: string;
  routedComingTimeline: TimelineItem | null;
  goalsEnabled: boolean;
  nextItemTitle: string;
  heroDoneLabel: string;
  heroProgress: number;
  scheduledItemCount: number;
  checkinsEnabled: boolean;
  myTodayCheckIn: { mood?: string | null } | null;
  myMood: Mood;
  homeMoodIconAccent: string;
  weather: WeatherStatus & { request: () => void };
  homeWeatherIconAccent: string;
  heatmapActivity: ActivityHeatmapDay[];
  enabledShortcuts: Shortcut[];
  reminderCount: number;
  taskCount: number;
  today: Date;
  isFeatureEnabled: (feature: any) => boolean;
  onHeatmapDayPress: (day: { dateKey: string }) => void;
  shortcutToneFor: (feature: FeatureId) => Tone;
}

const HomeHeroGrid = React.memo(function HomeHeroGrid({
  C,
  homeQuietHalo,
  homeChrome,
  homeSideOrb,
  homePanelBg,
  homePanelBorder,
  homeHeroInk,
  routedComingTimeline,
  goalsEnabled,
  nextItemTitle,
  heroDoneLabel,
  heroProgress,
  scheduledItemCount,
  checkinsEnabled,
  myTodayCheckIn,
  myMood,
  homeMoodIconAccent,
  weather,
  homeWeatherIconAccent,
  heatmapActivity,
  enabledShortcuts,
  reminderCount,
  taskCount,
  today,
  isFeatureEnabled,
  onHeatmapDayPress,
  shortcutToneFor,
}: HomeHeroGridProps) {
  return (
    <View style={styles.heroSection}>
      <View style={[styles.heroGrid, styles.heroHalo]}>
        {/* LEFT — tall TODAY'S PACTO */}
        <CardHalo
          style={styles.heroPactoHalo}
          lightColor={homeQuietHalo}
          darkColor={homeQuietHalo}
        >
        <PressScale
          haptic="impactMedium"
          pressedScale={0.97}
          onPress={() => {
            const route = routedComingTimeline
              ? routeForTimelineItem(routedComingTimeline, isFeatureEnabled)
              : goalsEnabled
                ? '/sheets/new-plan'
                : null;
            if (route) router.push(route as any);
          }}
          accessibilityLabel={`Open today's Pacto. ${nextItemTitle}. ${heroDoneLabel}.`}
          style={[
            styles.heroPactoCol,
            { backgroundColor: homeChrome.heroBg, borderColor: homeChrome.heroBorder },
          ]}
        >
          <View style={styles.heroOrb} />
          <View
            {...pointerEventsNoneProps}
            style={[
              styles.heroReminderBadge,
              Platform.OS === 'web' ? styles.pointerEventsNone : null,
              { backgroundColor: alphaColor(homeHeroInk, 0.14), borderColor: 'transparent' },
            ]}
          >
            <View style={[styles.heroReminderPing, { backgroundColor: C.accent3 }]} />
            <Icon name="bell" size={18} color={homeHeroInk} />
          </View>
          <Text style={[Typography.eyebrowSm, { color: alphaColor(homeHeroInk, 0.78) }]}>
            TODAY'S PACTO
          </Text>
          <Text
            style={[Typography.pixelHero, styles.heroPactoTitle, { color: homeHeroInk }]}
            numberOfLines={3}
          >
            {nextItemTitle}
          </Text>
          <View style={{ flex: 1 }} />
          <View style={styles.heroProgressTrack}>
            <View
              style={[
                styles.heroProgressFill,
                { width: `${heroProgress}%`, backgroundColor: C.accent2 },
              ]}
            />
          </View>
          <View style={styles.heroStatsCol}>
            <Text
              style={[Typography.captionMedium, styles.heroStatText, { color: homeHeroInk }]}
              numberOfLines={1}
            >
              {heroDoneLabel}
            </Text>
            <Text
              style={[Typography.captionMedium, styles.heroStatText, { color: homeHeroInk }]}
              numberOfLines={1}
            >
              {scheduledItemCount} scheduled
            </Text>
          </View>
        </PressScale>
        </CardHalo>

        {/* RIGHT — stacked check-in + weather */}
        <View style={styles.heroRightCol}>
          <CardHalo
            style={styles.heroSmallHalo}
            lightColor={homeQuietHalo}
            darkColor={homeQuietHalo}
          >
          <PressScale
            testID="home-checkin-card"
            onPress={() => {
              if (checkinsEnabled) router.push('/sheets/new-checkin' as any);
            }}
            haptic="impact"
            pressedScale={0.97}
            accessibilityLabel={
              myTodayCheckIn
                ? `Current signal: ${myMood.label}. Tap to update.`
                : 'Tap to check in.'
            }
            style={[
              styles.heroSmallCard,
              {
                backgroundColor: homeChrome.sideBg,
                borderColor: homeChrome.sideBorder,
                borderWidth: 1,
              },
            ]}
          >
            <Svg
              style={[StyleSheet.absoluteFill, styles.pointerEventsNone]}
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid slice"
            >
              <Circle cx="86" cy="92" r="40" fill={homeSideOrb} />
              <Circle cx="14" cy="-8" r="22" fill={homeSideOrb} />
            </Svg>
            <View style={styles.heroSmallTop}>
              <Text
                style={[
                  Typography.eyebrowSm,
                  { color: homeChrome.sideMuted, letterSpacing: 1.4, flexShrink: 1 },
                ]}
              >
                CURRENT SIGNAL
              </Text>
              <Icon
                testID="home-checkin-signal-icon"
                name={myMood.icon}
                size={27}
                color={homeMoodIconAccent}
              />
            </View>
            <View style={{ flex: 1 }} />
            <Text
              style={[
                Typography.pixelHero,
                {
                  color: homeChrome.sideInk,
                  fontSize: 26,
                  lineHeight: 28,
                  letterSpacing: 0,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {myTodayCheckIn ? myMood.label : 'check in'}
            </Text>
          </PressScale>
          </CardHalo>

          <CardHalo
            style={styles.heroSmallHalo}
            lightColor={homeQuietHalo}
            darkColor={homeQuietHalo}
          >
          <PressScale
            testID="home-weather-card"
            onPress={weather.request}
            haptic="impact"
            pressedScale={0.97}
            accessibilityLabel="Local conditions"
            style={[
              styles.heroSmallCard,
              {
                backgroundColor: homeChrome.sideBg,
                borderColor: homeChrome.sideBorder,
                borderWidth: 1,
              },
            ]}
          >
            <Svg
              style={[StyleSheet.absoluteFill, styles.pointerEventsNone]}
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid slice"
            >
              <Circle cx="14" cy="92" r="36" fill={homeSideOrb} />
              <Circle cx="92" cy="6" r="20" fill={homeSideOrb} />
            </Svg>
            <View style={styles.heroSmallTop}>
              <Text
                style={[
                  Typography.eyebrowSm,
                  { color: homeChrome.sideMuted, letterSpacing: 1.4, flexShrink: 1 },
                ]}
                numberOfLines={2}
              >
                {weather.state === 'ready' ? 'LOCAL CONDITIONS' : 'TAP TO ENABLE'}
              </Text>
              <Icon
                testID="home-weather-icon"
                name={weather.icon}
                size={27}
                color={homeWeatherIconAccent}
                strokeWidth={2.4}
              />
            </View>
            <View style={{ flex: 1 }} />
            {weather.state === 'ready' ? (
              (() => {
                const sepIdx = weather.title.indexOf(' · ');
                const tempPart = sepIdx >= 0 ? weather.title.slice(0, sepIdx) : weather.title;
                const labelPart = sepIdx >= 0 ? weather.title.slice(sepIdx + 3) : '';
                return (
                  <View>
                    <Text
                      style={{
                        fontFamily: Typography.pixelFont,
                        color: homeChrome.sideInk,
                        fontSize: 36,
                        lineHeight: 38,
                        letterSpacing: 0,
                        fontVariant: ['tabular-nums'],
                      }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {tempPart}
                    </Text>
                    {labelPart ? (
                      <Text
                        style={[
                          Typography.captionMedium,
                          { color: homeChrome.sideMuted, fontSize: 13, lineHeight: 15, marginTop: 2 },
                        ]}
                        numberOfLines={1}
                      >
                        {labelPart}
                      </Text>
                    ) : null}
                  </View>
                );
              })()
            ) : (
              <Text
                style={[
                  Typography.captionMedium,
                  { color: homeChrome.sideInk, fontSize: 14, lineHeight: 16 },
                ]}
                numberOfLines={2}
              >
                {weather.title}
              </Text>
            )}
          </PressScale>
          </CardHalo>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <View style={styles.togetherHeadRow}>
          <Text style={[Typography.eyebrow, { color: C.ink3 }]}>ACTIVITY</Text>
          <Text
            style={[Typography.eyebrow, styles.tabularText, { color: C.accent2 }]}
          >
            4 WEEKS
          </Text>
        </View>
        <CardHalo lightColor={homeQuietHalo} darkColor={homeQuietHalo}>
          <MonthlyHeatmap
            days={heatmapActivity}
            weeks={4}
            palette={homeChrome.activityPalette}
            todayColor={C.accent}
            surfaceColor={homePanelBg}
            borderColor={homePanelBorder}
            onDayPress={onHeatmapDayPress}
          />
        </CardHalo>
      </View>

      <CardHalo
        style={styles.shortcutHalo}
        lightColor={homeQuietHalo}
        darkColor={homeQuietHalo}
      >
      <View
        style={[
          styles.shortcutRail,
          { backgroundColor: homePanelBg },
        ]}
      >
        {enabledShortcuts.slice(0, 3).map((s, index) => {
          const tone = shortcutToneFor(s.feature);
          const stat =
            s.feature === 'recurring'
              ? String(reminderCount)
              : s.feature === 'tasks'
                ? String(taskCount)
                : s.feature === 'calendar'
                  ? format(today, 'EEE').toUpperCase()
                  : 'NEW';
          return (
            <ColorTile
              key={s.label}
              tone={tone}
              title={s.label}
              icon={s.icon}
              stat={stat}
              statLabel={s.description.toUpperCase()}
              onPress={() => router.push(s.route as any)}
              accessibilityLabel={`Open ${s.label}. ${s.description}`}
              style={[
                styles.shortcutSegment,
                index < 2
                  ? { borderRightColor: homePanelBorder, borderRightWidth: 1 }
                  : null,
              ]}
            />
          );
        })}
        <View
          {...pointerEventsNoneProps}
          style={[
            styles.railBorderOverlay,
            Platform.OS === 'web' ? styles.pointerEventsNone : null,
            { borderColor: homePanelBorder },
          ]}
        />
      </View>
      </CardHalo>
    </View>
  );
});

const styles = StyleSheet.create({
  heroSection: {
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 20,
  },
  heroHalo: {
    marginTop: 10,
  },
  heroPactoHalo: {
    flex: 1.42,
    alignSelf: 'stretch',
  },
  heroSmallHalo: {
    flex: 1,
  },
  shortcutHalo: {
    marginTop: 14,
  },
  heroGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  heroPactoCol: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    minHeight: 248,
    overflow: 'hidden',
    position: 'relative',
  },
  heroReminderBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 10px rgba(16, 21, 37, 0.10)' }
      : {
          shadowColor: '#101525',
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        }),
  },
  heroReminderPing: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  heroOrb: {
    position: 'absolute',
    right: -42,
    bottom: -48,
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroPactoTitle: {
    color: '#fff',
    marginTop: 10,
    fontSize: 31,
    lineHeight: 33,
    letterSpacing: 0,
  },
  heroProgressTrack: {
    marginTop: 24,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  heroStatsCol: {
    marginTop: 10,
    gap: 4,
  },
  heroRightCol: {
    flex: 0.78,
    flexDirection: 'column',
    gap: 10,
  },
  heroSmallCard: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    overflow: 'hidden',
    minHeight: 101,
  },
  heroSmallTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroStatText: {
    color: '#F7F0E5',
    fontVariant: ['tabular-nums'],
  },
  shortcutRail: {
    position: 'relative',
    flexDirection: 'row',
    borderRadius: 22,
    overflow: 'hidden',
  },
  shortcutSegment: {
    flex: 1,
    width: 'auto',
    minHeight: 132,
    padding: 12,
    borderRadius: 0,
    borderWidth: 0,
  },
  railBorderOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 22,
    borderWidth: 1,
    zIndex: 20,
    elevation: 20,
  },
  togetherHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  tabularText: {
    fontVariant: ['tabular-nums'],
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
});

export default HomeHeroGrid;
