const {
  expoRouterBabelPlugin,
} = require("babel-preset-expo/build/plugins/expo-router-plugin");

module.exports = (api) => {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [expoRouterBabelPlugin],
  };
};
