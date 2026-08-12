/// <reference types="expo-router/types" />

import "react";

declare module "react" {
  interface Component<P = {}, S = {}, SS = any> {
    render(): ReactNode;
  }
}
