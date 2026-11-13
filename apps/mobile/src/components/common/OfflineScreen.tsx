import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

interface OfflineScreenProps {
  onRetry: () => void;
  onContinueOffline?: () => void;
  retrying?: boolean;
  language?: string;
}

export const OfflineScreen: React.FC<OfflineScreenProps> = ({
  onRetry,
  onContinueOffline,
  retrying = false,
}) => {
  const { colors } = useTheme();
  const { strings } = useI18n();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        <View style={[styles.illustrationBox, { backgroundColor: colors.primarySoft }]}>
          <Svg width={72} height={72} viewBox="0 0 64 64" fill="none">
            <Circle cx="32" cy="48" r="3" fill={colors.primary} />
            <Path
              d="M22 39C24.8 36.2 28.2 35 32 35C35.8 35 39.2 36.2 42 39"
              stroke={colors.primary}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <Path
              d="M14 31C19 26 25.2 23.5 32 23.5C38.8 23.5 45 26 50 31"
              stroke={colors.primaryDark}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <Path
              d="M7 22C13.8 15.6 22.5 12 32 12C41.5 12 50.2 15.6 57 22"
              stroke={colors.borderStrong}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <Path d="M14 50L50 14" stroke={colors.danger} strokeWidth="4" strokeLinecap="round" />
          </Svg>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {strings.modals.offlineTitle}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {strings.modals.offlineDesc}
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primaryDark }]}
          onPress={onRetry}
          disabled={retrying}
          activeOpacity={0.85}
        >
          {retrying ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
              {strings.modals.offlineRetry}
            </Text>
          )}
        </TouchableOpacity>

        {onContinueOffline && (
          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              { backgroundColor: colors.primarySoft, borderColor: colors.borderStrong },
            ]}
            onPress={onContinueOffline}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
              📥 {strings.modals.offlineGoDownloads}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  illustrationBox: {
    width: 104,
    height: 104,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 12,
    width: '100%',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
