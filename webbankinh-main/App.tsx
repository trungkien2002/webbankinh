<<<<<<< HEAD
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
=======
import { StatusBar } from 'expo-status-bar';
import { Home } from './src/screens/home';

export default function App() {
  return (
    <>
      <Home />
>>>>>>> 49d1c2308f79763b90d6e7cdaca83432bb9e9d15
      <StatusBar style="auto" />
    </>
  );
}
<<<<<<< HEAD
=======

>>>>>>> 49d1c2308f79763b90d6e7cdaca83432bb9e9d15
