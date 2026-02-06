import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setLanguage } from '../../lib/i18n';

export default function ProgressScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const currentLang = i18n.language;

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('progressStats')}</Text>
      <Text style={styles.subtext}>{t('trackPRs')}</Text>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>{t('language')}</Text>
        <View style={styles.langSelector}>
          <TouchableOpacity
            style={[styles.langButton, currentLang === 'en' && styles.langButtonActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.langText, currentLang === 'en' && styles.langTextActive]}>
              {t('english')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langButton, currentLang === 'ru' && styles.langButtonActive]}
            onPress={() => setLanguage('ru')}
          >
            <Text style={[styles.langText, currentLang === 'ru' && styles.langTextActive]}>
              {t('russian')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  settingsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  langSelector: {
    flexDirection: 'row',
  },
  langButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  langButtonActive: {
    backgroundColor: '#007AFF',
  },
  langText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  langTextActive: {
    color: '#fff',
  },
});
