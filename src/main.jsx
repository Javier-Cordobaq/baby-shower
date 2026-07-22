import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BabyShower from "./BabyShower.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BabyShower />
  </StrictMode>
);
