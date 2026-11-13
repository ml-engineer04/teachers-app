import React from 'react';
import { Image, View, StyleSheet, Text } from 'react-native';

const logoDark = require('../../../assets/brand/logo-dark.png');
const logoLight = require('../../../assets/brand/logo-light.png');

interface BrandLogoProps {
  size?: number;
  darkSurface?: boolean;
  variant?: string;
  withContainer?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 40,
  darkSurface = false,
}) => {
  const currentSrc = darkSurface ? logoDark : logoLight;
  const height = size;
  const width = Math.round(size * (624 / 219));

  return (
    <View style={styles.container}>
      <Image
        source={currentSrc}
        style={{ width, height }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
