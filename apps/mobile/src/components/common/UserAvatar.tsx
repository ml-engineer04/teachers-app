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
  const initial = (effectiveText.charAt(0) || 'O').toUpperCase();

  // Distinct energetic palette based on initial
  const colors = [
    '#2563EB', // Blue
    '#7C3AED', // Violet
    '#059669', // Emerald
    '#EA580C', // Orange
    '#0284C7', // Sky
    '#D97706', // Amber
    '#4F46E5', // Indigo
    '#DB2777', // Pink
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
