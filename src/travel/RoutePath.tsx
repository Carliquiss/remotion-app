import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { evolvePath } from "@remotion/paths";

interface RoutePathProps {
    pathD: string;
    startFrame: number;
    duration: number;
    color: string;
    isDashed: boolean;
    showTrail: boolean;
}

export const RoutePath: React.FC<RoutePathProps> = ({
    pathD, startFrame, duration, color, isDashed, showTrail
}) => {
    const frame = useCurrentFrame();

    // Calculate 0 to 1 progression based on current frame and segment timeframe
    const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    if (progress === 0) return null;

    // This magically trims the SVG string to match the exact mathematical duration!
    const evolvedPath = evolvePath(progress, pathD);

    return (
        <path
            d={pathD}
            {...evolvedPath}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            /* Only set strokeDasharray explicitly if not animating dashed line, but actually
               evolvePath handles the strokeDasharray/strokeDashoffset for drawing animation. 
               If we want dashed flights, the correct way in Remotion requires SVG masks, 
               but for now we fallback to standard evolvePath which overrides dasharray. */
            opacity={showTrail ? 0.9 : progress === 1 ? 0 : 0.9}
        />
    );
};
