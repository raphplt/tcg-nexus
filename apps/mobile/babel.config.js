const {
  expoRouterBabelPlugin,
} = require("babel-preset-expo/build/expo-router-plugin");

module.exports = (api) => {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    // In this monorepo, expo-router is installed in apps/mobile/node_modules.
    // babel-preset-expo auto-detection can miss it when resolving from the
    // workspace root, so we wire the router env transform explicitly.
    plugins: [expoRouterBabelPlugin],
  };
};
