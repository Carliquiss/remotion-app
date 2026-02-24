import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { MapLayer } from "./MapLayer";
import { RoutePath } from "./RoutePath";
import { MovingMarker } from "./MovingMarker";
import { SegmentLabel } from "./SegmentLabel";
import { createProjection, getGreatCirclePath, getStraightLinePath } from "./geo";
import type { Itinerary } from "./types";

export interface TravelMapProps {
    itinerary: Itinerary;
    showIcons?: boolean;
    showTrail?: boolean;
}

export const TravelMapComposition = ({ itinerary, showIcons = true, showTrail = true }: TravelMapProps) => {
    const { width, height } = useVideoConfig();
    const projection = useMemo(() => createProjection(width, height), [width, height]);

    // Precalculate frame timings continuously block by block
    let currentFrame = 20; // initial baseline delay
    const REST_FRAMES = 30; // 1 second break between modes

    const precalculatedSegments = itinerary.segments.map((seg) => {
        const start = currentFrame;
        const end = start + seg.durationInFrames;
        currentFrame = end + REST_FRAMES;

        const pathD = seg.mode === "plane"
            ? getGreatCirclePath(seg.from.coord, seg.to.coord, projection, 100)
            : getStraightLinePath(seg.from.coord, seg.to.coord, projection);

        return {
            ...seg,
            pathD,
            startFrame: start,
            endFrame: end,
            startPt: projection(seg.from.coord) || [0, 0],
            endPt: projection(seg.to.coord) || [0, 0],
        };
    });

    return (
        <AbsoluteFill>
            <MapLayer />

            <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
                {precalculatedSegments.map((seg, i) => (
                    <React.Fragment key={seg.id}>
                        {/* 1. Draw Paths */}
                        <RoutePath
                            pathD={seg.pathD}
                            startFrame={seg.startFrame}
                            duration={seg.durationInFrames}
                            color={seg.color || (seg.mode === "plane" ? "#38bdf8" : "#fbbf24")}
                            isDashed={seg.mode === "plane"}
                            showTrail={showTrail}
                        />

                        {/* 2. Tracking Icons */}
                        {showIcons && (
                            <MovingMarker
                                pathD={seg.pathD}
                                startFrame={seg.startFrame}
                                duration={seg.durationInFrames}
                                mode={seg.mode}
                                hideAfterEnd={i < precalculatedSegments.length - 1} // Disappear seamlessly if there's a next mode of transport
                            />
                        )}

                        {/* 3. Popout City Labels */}
                        {/* Start City (Pops 10 frames before travel begins) */}
                        <SegmentLabel
                            x={seg.startPt[0]}
                            y={seg.startPt[1]}
                            text={seg.from.name}
                            revealFrame={seg.startFrame - 10}
                        />
                        {/* End City (Pops exactly when travel finishes) */}
                        <SegmentLabel
                            x={seg.endPt[0]}
                            y={seg.endPt[1]}
                            text={seg.to.name}
                            revealFrame={seg.endFrame}
                        />
                    </React.Fragment>
                ))}
            </svg>
        </AbsoluteFill>
    );
};
