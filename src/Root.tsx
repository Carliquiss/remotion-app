import { Composition } from "remotion";
import { TravelMapComposition } from "./travel/TravelMapComposition";
import { sampleItinerary } from "./travel/itineraryData";
import "./index.css";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TravelMap"
        component={TravelMapComposition as React.FC<any>}
        durationInFrames={300} // Total ~10 seconds
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          itinerary: sampleItinerary,
          showIcons: true,
          showTrail: true,
        }}
      />
    </>
  );
};
