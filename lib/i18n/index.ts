import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en';
import ru from './ru';

const LANGUAGE_KEY = 'app_language';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export async function loadSavedLanguage() {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved) {
      i18n.changeLanguage(saved);
    }
  } catch (error) {
    console.error('Failed to load saved language:', error);
  }
}

export async function setLanguage(lang: 'en' | 'ru') {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    i18n.changeLanguage(lang);
  } catch (error) {
    console.error('Failed to save language:', error);
  }
}

export default i18n;
