import { useEffect, useState } from "react";
import { Application } from "@pixi/react";
import Game from "./game/Game";

const App = () => {
  // Track viewport so the Game component can center its level inside the
  // stage. Pixi resizes the canvas automatically when we feed it new
  // width/height props.
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const onResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <Application
      width={size.width}
      height={size.height}
      background={0x1a1f2e}
      antialias
    >
      <Game stageWidth={size.width} stageHeight={size.height} />
    </Application>
  );
};

export default App;
