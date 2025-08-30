const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)

// Add TensorFlow.js compatibility
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.alias = {
  ...config.resolver.alias,
  'crypto': require.resolve('expo-crypto'),
};

// Add bin to assetExts for TensorFlow.js models
const { assetExts } = config.resolver;
config.resolver.assetExts = [...assetExts, 'bin'];

module.exports = withNativeWind(config, { input: './global.css' })