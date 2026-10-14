import { StatusBar } from "expo-status-bar";
import { WebApp } from "./src/screens/web";
import { useFonts } from "expo-font";
import { WebStyles } from "./src/components/webStyles";

export default function App() {
  const [loaded, error] = useFonts({
    ElanSans: require("./assets/fonts/BeVietnamPro-Regular.ttf"),
  });
  if (!loaded && !error) return null;
  return (
    <>
      <WebStyles />
      <WebApp />
      <StatusBar style="auto" />
    </>
  );
}
