import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { BulletList } from "./BulletList";
import { TravelAnimation } from "./TravelAnimation";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TravelMap"
        component={TravelAnimation}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="TravelItems"
        component={BulletList}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={60}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
