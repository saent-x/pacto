import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Currency = {
  code: string;
  symbol: string;
  name: string;
  country: string;
  flag: string;
};

export const CURRENCIES: Currency[] = [
  // Most-used (top of list)
  { code: 'USD', symbol: '$', name: 'US Dollar', country: 'United States', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', country: 'Eurozone', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', country: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', country: 'Japan', flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', country: 'China', flag: '🇨🇳' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'India', flag: '🇮🇳' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', country: 'Canada', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', country: 'Australia', flag: '🇦🇺' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', country: 'Switzerland', flag: '🇨🇭' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', country: 'New Zealand', flag: '🇳🇿' },
  // Africa
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', country: 'Nigeria', flag: '🇳🇬' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', country: 'South Africa', flag: '🇿🇦' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', country: 'Egypt', flag: '🇪🇬' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', country: 'Kenya', flag: '🇰🇪' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', country: 'Ghana', flag: '🇬🇭' },
  { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', country: 'Morocco', flag: '🇲🇦' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', country: 'West Africa', flag: '🌍' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', country: 'Central Africa', flag: '🌍' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', country: 'Tanzania', flag: '🇹🇿' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', country: 'Uganda', flag: '🇺🇬' },
  // Americas
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', country: 'Brazil', flag: '🇧🇷' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', country: 'Mexico', flag: '🇲🇽' },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', country: 'Argentina', flag: '🇦🇷' },
  { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso', country: 'Chile', flag: '🇨🇱' },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', country: 'Colombia', flag: '🇨🇴' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', country: 'Peru', flag: '🇵🇪' },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso', country: 'Uruguay', flag: '🇺🇾' },
  // Europe (non-Euro)
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', country: 'Norway', flag: '🇳🇴' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', country: 'Sweden', flag: '🇸🇪' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', country: 'Denmark', flag: '🇩🇰' },
  { code: 'ISK', symbol: 'kr', name: 'Icelandic Króna', country: 'Iceland', flag: '🇮🇸' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', country: 'Poland', flag: '🇵🇱' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', country: 'Czechia', flag: '🇨🇿' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', country: 'Hungary', flag: '🇭🇺' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', country: 'Romania', flag: '🇷🇴' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', country: 'Bulgaria', flag: '🇧🇬' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', country: 'Türkiye', flag: '🇹🇷' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', country: 'Ukraine', flag: '🇺🇦' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', country: 'Russia', flag: '🇷🇺' },
  // Middle East
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', country: 'UAE', flag: '🇦🇪' },
  { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', country: 'Qatar', flag: '🇶🇦' },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', country: 'Kuwait', flag: '🇰🇼' },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', country: 'Bahrain', flag: '🇧🇭' },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', country: 'Oman', flag: '🇴🇲' },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', country: 'Jordan', flag: '🇯🇴' },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', country: 'Israel', flag: '🇮🇱' },
  { code: 'IRR', symbol: '﷼', name: 'Iranian Rial', country: 'Iran', flag: '🇮🇷' },
  // Asia
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', country: 'South Korea', flag: '🇰🇷' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', country: 'Singapore', flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', country: 'Hong Kong', flag: '🇭🇰' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar', country: 'Taiwan', flag: '🇹🇼' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', country: 'Malaysia', flag: '🇲🇾' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', country: 'Indonesia', flag: '🇮🇩' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', country: 'Thailand', flag: '🇹🇭' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', country: 'Philippines', flag: '🇵🇭' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', country: 'Vietnam', flag: '🇻🇳' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', country: 'Pakistan', flag: '🇵🇰' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', country: 'Bangladesh', flag: '🇧🇩' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'NPR', symbol: 'NRs', name: 'Nepalese Rupee', country: 'Nepal', flag: '🇳🇵' },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', country: 'Kazakhstan', flag: '🇰🇿' },
];

export function findCurrency(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

type PrefsState = {
  currencyCode: string;
  setCurrencyCode: (code: string) => void;
};

export const usePreferences = create<PrefsState>()(
  persist(
    (set) => ({
      currencyCode: 'USD',
      setCurrencyCode: (code) => set({ currencyCode: code }),
    }),
    {
      name: 'pacto-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
