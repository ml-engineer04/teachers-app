import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  notify,
  AppNotification,
  NotificationType,
} from '../../services/notifications/notificationService';
import { DS } from '../../theme/designSystem';
import { useTheme } from '../../theme/ThemeContext';

const TONE_MAP: Record<
  NotificationType,
  { accent: string; softBg: string; border: string }
> = {
  success: { accent: '#10B981', softBg: '#ECFDF5', border: '#A7F3D0' },
  error: { accent: '#EF4444', softBg: '#FEF2F2', border: '#FECACA' },
  warning: { accent: '#F59E0B', softBg: '#FFFBEB', border: '#FDE68A' },
  info: { accent: '#2563EB', softBg: '#EFF6FF', border: '#BFDBFE' },
};

const NotificationGlyph: React.FC<{ type: NotificationType; color: string }> = ({
  type,
  color,
}) => {
  if (type === 'success') {
    return (
      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9.5} stroke={color} strokeWidth={2} />
        <Path
          d="M8.5 12.2l2.4 2.4 4.8-5"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (type === 'error') {
    return (
      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9.5} stroke={color} strokeWidth={2} />
        <Path
          d="M15 9l-6 6M9 9l6 6"
          stroke={color}
          strokeWidth={2.1}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (type === 'warning') {
    return (
      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 3.5L21 19.5H3L12 3.5z"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Path d="M12 9.5v4.5M12 17h.01" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9.5} stroke={color} strokeWidth={2} />
      <Path d="M12 11v5.5M12 8h.01" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
};

/**
 * Global floating toast/notification host. Renders above screens (and via portal
 * onto document.body on Web so notifications stay visible even above active Modals).
 */
export const NotificationBanner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    return notify.subscribe(setItems);
  }, []);

  if (items.length === 0) return null;

  const topOffset =
    Platform.OS === 'web'
      ? 14
      : Platform.OS === 'android'
      ? Math.max((StatusBar.currentHeight || 24) + 8, 32)
      : 52;

  const content = (
    <View style={[styles.hostWrap, { top: topOffset }]} pointerEvents="box-none">
      {items.map((item) => {
        const tone = TONE_MAP[item.type];
        const accentColor =
          item.type === 'success'
            ? colors.accent
            : item.type === 'error'
            ? colors.danger
            : item.type === 'warning'
            ? colors.warning
            : isDark
            ? colors.primaryText
            : '#4F46E5';
        return (
          <View
            key={item.id}
            style={[
              styles.toastCard,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                borderColor: isDark ? colors.borderStrong : tone.border,
                borderLeftColor: accentColor,
                shadowColor: colors.shadowColor,
              },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <View style={[styles.iconBadge, { backgroundColor: isDark ? colors.surfaceAlt : tone.softBg }]}>
              <NotificationGlyph type={item.type} color={accentColor} />
            </View>

            <View style={styles.textCol}>
              <Text style={[styles.titleText, { color: colors.textPrimary }]} numberOfLines={2}>
                {item.title}
              </Text>
              {item.message ? (
                <Text style={[styles.messageText, { color: colors.textSecondary }]} numberOfLines={3}>
                  {item.message}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={() => notify.dismiss(item.id)}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.closeTxt, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ReactDOM = require('react-dom');
      if (ReactDOM?.createPortal) {
        return ReactDOM.createPortal(
          <View
            style={styles.webPortalFixed}
            pointerEvents="box-none"
          >
            {content}
          </View>,
          document.body,
        );
      }
    } catch {
      // Fallback to inline React Native overlay below
    }
  }

  return content;
};

const styles = StyleSheet.create({
  webPortalFixed: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2147483647,
    pointerEvents: 'none',
  },
  hostWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 30,
    alignItems: 'center',
    gap: 8,
  },
  toastCard: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
  },
  titleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: DS.colors.textPrimary,
    lineHeight: 18,
  },
  messageText: {
    fontSize: 12,
    color: DS.colors.textSecondary,
    lineHeight: 16.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  closeTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: DS.colors.textMuted,
  },
});
