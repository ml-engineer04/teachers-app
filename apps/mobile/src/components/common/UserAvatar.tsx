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

  // Pick brand palette colors based on initial
  const colors = [
    '#2A4FB8', // Ilm ko'k (Primary)
    '#223F94', // Deep Ilm ko'k
    '#0E7C70', // Zumrad-teal
    '#6D3FD1', // Binafsha
    '#C23B5A', // Rose
    '#15803D', // Yashil
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
