import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, Easing } from "remotion";
import { MapLayer } from "./MapLayer";
import { RoutePath } from "./RoutePath";
import { MovingMarker } from "./MovingMarker";
import { SegmentLabel } from "./SegmentLabel";
import { createProjection, getGreatCirclePath, getStraightLinePath, REGION_BOUNDS_ANDALUCIA, REGION_BOUNDS_SPAIN_CANARIES } from "./geo";
import { geoMercator } from "d3-geo";
import type { Itinerary } from "./types";

export interface TravelMapProps {
    itinerary: Itinerary;
    showIcons?: boolean;
    showTrail?: boolean;
}

export const TravelMapComposition = ({ itinerary, showIcons = true, showTrail = true }: TravelMapProps) => {
    const { width, height } = useVideoConfig();
    const frame = useCurrentFrame();

    // 1. Calculate static frame timings ONCE
    const timings = useMemo(() => {
        let current = 20; // initial baseline delay
        const REST = 30; // break between modes
        return itinerary.segments.map(seg => {
            const start = current;
            const end = start + seg.durationInFrames;
            current = end + REST;
            return { startFrame: start, endFrame: end };
        });
    }, [itinerary]);

    // 2. Define the camera transition (Zoom out starts right after the first segment ends)
    const firstSegmentEnd = timings[0]?.endFrame || 60;
    const zoomStartFrame = firstSegmentEnd;
    const zoomEndFrame = firstSegmentEnd + 60; // 2 seconds to zoom out

    // 3. Create the dynamic projection for THIS frame
    const projection = useMemo(() => {
        const projStart = createProjection(width, height, REGION_BOUNDS_ANDALUCIA);
        const projEnd = createProjection(width, height, REGION_BOUNDS_SPAIN_CANARIES);

        const progress = interpolate(frame, [zoomStartFrame, zoomEndFrame], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.inOut(Easing.cubic)
        });

        const scale = interpolate(progress, [0, 1], [projStart.scale(), projEnd.scale()]);
        const transX = interpolate(progress, [0, 1], [projStart.translate()[0], projEnd.translate()[0]]);
        const transY = interpolate(progress, [0, 1], [projStart.translate()[1], projEnd.translate()[1]]);

        return geoMercator().scale(scale).translate([transX, transY]);
    }, [frame, width, height, zoomStartFrame, zoomEndFrame]);

    // 4. Calculate dynamic paths coordinates for THIS frame
    const activeSegments = itinerary.segments.map((seg, i) => {
        const time = timings[i];
        const pathD = seg.mode === "plane"
            ? getGreatCirclePath(seg.from.coord, seg.to.coord, projection, 100)
            : getStraightLinePath(seg.from.coord, seg.to.coord, projection);

        return {
            ...seg,
            ...time,
            pathD,
            startPt: projection(seg.from.coord) || [0, 0],
            endPt: projection(seg.to.coord) || [0, 0],
        };
    });

    // 5. Calculate unique stops to avoid duplicate rendering (and assign nice colors/alignments)
    const stops = useMemo(() => {
        if (activeSegments.length === 0) return [];
        const first = activeSegments[0];

        // Add start city
        const res = [
            { id: "start", name: first.from.name, pt: first.startPt, revealFrame: first.startFrame - 10, color: "#ffedd5", align: "top-right" }
        ] as { id: string, name: string, pt: [number, number], revealFrame: number, color: string, align: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "right" }[];

        // Add end cities for each segment
        activeSegments.forEach((seg, i) => {
            let color = seg.mode === "plane" ? "#e0e7ff" : "#fef08a";
            let align: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "right" = "bottom-left";
            if (i === 1) align = "bottom-right"; // Lanzarote goes bottom right

            res.push({
                id: `stop-${i}`,
                name: seg.to.name,
                pt: seg.endPt,
                revealFrame: seg.endFrame,
                color,
                align
            });
        });

        return res;
    }, [activeSegments]);

    return (
        <AbsoluteFill>
            <MapLayer projection={projection} />

            <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
                {activeSegments.map((seg, i) => (
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
                                hideAfterEnd={i < activeSegments.length - 1} // Disappear seamlessly if there's a next mode of transport
                            />
                        )}
                    </React.Fragment>
                ))}

                {/* 3. Popout City Labels (Deduplicated) */}
                {stops.map(stop => (
                    <SegmentLabel
                        key={stop.id}
                        x={stop.pt[0]}
                        y={stop.pt[1]}
                        text={stop.name}
                        revealFrame={stop.revealFrame}
                        color={stop.color}
                        align={stop.align}
                    />
                ))}
            </svg>
        </AbsoluteFill>
    );
};
