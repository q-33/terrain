import { useEffect, useState } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics } from "pixi.js";

// extend() registers Pixi classes as JSX intrinsic elements. Without this,
// <pixiContainer> / <pixiGraphics> wouldn't exist as components.
extend({ Container, Graphics });

const App = () => {
  // Pixi's Application can resizeTo={window}, but its child draw callbacks
  // don't re-fire on resize — so we track viewport size in React state and
  // re-render when it changes. Phase-C2 work (tilemap, scrolling) will move
  // to a camera/viewport abstraction; this is fine for a single static stage.
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
      <pixiContainer>
        <pixiGraphics
          draw={(g) => {
            g.clear();
            // Centered rounded rectangle as a visual proof-of-life. C2 will
            // replace this with the tilemap and Gizmo sprite.
            const cx = size.width / 2;
            const cy = size.height / 2;
            g.roundRect(cx - 96, cy - 96, 192, 192, 24);
            g.fill(0xf5c25a);
            g.circle(cx, cy, 6);
            g.fill(0x1a1f2e);
          }}
        />
      </pixiContainer>
    </Application>
  );
};

export default App;
