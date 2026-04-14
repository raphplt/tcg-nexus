/// <reference types="expo-router/types" />

// Fix @types/react >=19.1 compatibility with React Native 0.79 class components
// See: https://github.com/facebook/react-native/issues/48854
import "react";

declare module "react" {
  interface Component<P = {}, S = {}, SS = any> {
    render(): ReactNode;
  }
}
