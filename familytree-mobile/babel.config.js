module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // reanimated plugin must be last AND only applies to native builds
      // On web it causes the "z is not defined" crash
      ...(process.env.EXPO_TARGET === 'web' ? [] : ['react-native-reanimated/plugin']),
    ],
  };
};