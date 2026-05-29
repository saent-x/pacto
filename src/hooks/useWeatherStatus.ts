import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { IconName } from '@/src/components/ui/Icon';

export type WeatherStatus =
  | { state: 'loading'; title: string; detail: string; icon: IconName }
  | { state: 'ready'; title: string; detail: string; icon: IconName }
  | { state: 'unavailable'; title: string; detail: string; icon: IconName };

function weatherMeta(code: number | null | undefined): { label: string; icon: IconName } {
  if (code == null) return { label: 'Current conditions', icon: 'cloud' };
  if (code === 0) return { label: 'Clear', icon: 'sun' };
  if ([1, 2, 3].includes(code)) return { label: 'Partly cloudy', icon: 'cloud' };
  if ([45, 48].includes(code)) return { label: 'Foggy', icon: 'cloud' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: 'Rain nearby', icon: 'cloudRain' };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snowy', icon: 'cloud' };
  if ([95, 96, 99].includes(code)) return { label: 'Storm watch', icon: 'zap' };
  return { label: 'Weather update', icon: 'cloud' };
}

export function useWeatherStatus(): WeatherStatus & { request: () => void } {
  const [status, setStatus] = useState<WeatherStatus>({
    state: 'unavailable',
    title: 'Weather needs location',
    detail: 'Tap to allow local conditions.',
    icon: 'mapPin',
  });

  const loadWeather = useCallback(async ({ requestPermission }: { requestPermission: boolean }) => {
    const fetcher = (globalThis as any).fetch;

    setStatus({
      state: 'loading',
      title: 'Checking weather',
      detail: 'Looking for local conditions.',
      icon: 'cloud',
    });

    if (typeof fetcher !== 'function') {
      setStatus({
        state: 'unavailable',
        title: 'Weather unavailable',
        detail: 'Network access is not available here.',
        icon: 'mapPin',
      });
      return;
    }

    try {
      const permission = requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus({
          state: 'unavailable',
          title: requestPermission ? 'Location not enabled' : 'Weather needs location',
          detail: requestPermission
            ? 'Allow location in Settings to show weather.'
            : 'Tap to allow local conditions.',
          icon: 'mapPin',
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords ?? {};
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new Error('Missing coordinates');
      }
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(3)}` +
        `&longitude=${longitude.toFixed(3)}&current=temperature_2m,weather_code`;
      const response = await fetcher(url);
      if (!response?.ok) throw new Error('Weather request failed');
      const data = await response.json();
      const temp = data?.current?.temperature_2m;
      const code = data?.current?.weather_code;
      const meta = weatherMeta(typeof code === 'number' ? code : null);
      const tempLabel = typeof temp === 'number' ? `${Math.round(temp)}°` : 'Live';
      setStatus({
        state: 'ready',
        title: `${tempLabel} · ${meta.label}`,
        detail: 'Live local weather for today.',
        icon: meta.icon,
      });
    } catch {
      setStatus({
        state: 'unavailable',
        title: 'Weather unavailable',
        detail: 'Live conditions could not be loaded.',
        icon: 'cloud',
      });
    }
  }, []);

  useEffect(() => {
    loadWeather({ requestPermission: false }).catch(() => undefined);
  }, [loadWeather]);

  const request = useCallback(() => {
    loadWeather({ requestPermission: true }).catch(() => undefined);
  }, [loadWeather]);

  return { ...status, request };
}
