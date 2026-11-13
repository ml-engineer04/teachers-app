import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';

interface UserAvatarProps {
  name?: string;
  email?: string;
  photoUrl?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = '',
  email = '',
  photoUrl,
  size = 40,
  style,
  textStyle,
}) => {
  if (photoUrl && photoUrl.startsWith('http')) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: '#E2E8F0',
          },
          style as any,
        ]}
      />
    );
  }

  const effectiveText = (name || email || 'O').trim();
  const words = effectiveText.split(/\s+/).filter(Boolean);
  const initial =
    words.length >= 2
      ? `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase()
      : (effectiveText.charAt(0) || 'O').toUpperCase();

  // Pick energetic royal-indigo / brand color based on initial
  const colors = [
    '#4F46E5', // Indigo (Design System Primary)
    '#3730A3', // Deep Indigo
    '#2563EB', // Royal Blue
    '#7C3AED', // Violet
    '#059669', // Emerald
    '#0284C7', // Sky
  ];
  const charCode = initial.charCodeAt(0) || 0;
  const bgColor = colors[charCode % colors.length];

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.initial,
          {
            fontSize: Math.round(size * 0.44),
            lineHeight: Math.round(size * 0.52),
          },
          textStyle,
        ]}
      >
        {initial}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
});
