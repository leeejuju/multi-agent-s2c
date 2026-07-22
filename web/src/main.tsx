import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/noto-sans-sc/wght.css";
import "@fontsource/courier-prime/400.css";
import "@fontsource/courier-prime/700.css";
import "@fontsource/noto-serif-sc/chinese-simplified-400.css";
import "@fontsource/noto-serif-sc/chinese-simplified-700.css";
import "lxgw-wenkai-mono-gb-screen-webfont/fonts/style.css";

import "@/assets/css/Global.css";
import App from "@/App";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Missing #app root element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
