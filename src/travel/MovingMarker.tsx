import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";
import type { TransportMode } from "./types";

interface MovingMarkerProps {
    pathD: string;
    startFrame: number;
    duration: number;
    mode: TransportMode;
    hideAfterEnd?: boolean;
}

export const MovingMarker: React.FC<MovingMarkerProps> = ({ pathD, startFrame, duration, mode, hideAfterEnd = false }) => {
    const frame = useCurrentFrame();

    const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    const { pos, angleDeg } = useMemo(() => {
        const totalLength = getLength(pathD);
        const currentDistance = totalLength * progress;

        // Find exact physical x/y on screen
        const p = getPointAtLength(pathD, currentDistance);
        // Find curve tangent to determine rotation
        const t = getTangentAtLength(pathD, Math.max(0, Math.min(totalLength, currentDistance)));
        const angle = (Math.atan2(t.y, t.x) * 180) / Math.PI;

        return { pos: p, angleDeg: angle };
    }, [pathD, progress]);

    if (progress === 0 || (hideAfterEnd && progress === 1)) return null;

    const getIcon = () => {
        switch (mode) {
            case "plane": return "✈️";
            case "bus": return "🚌";
            default: return "📍";
        }
    };

    // Emoji Plane '✈️' typically points slightly Up-Right by default, adding a 45deg offset aligns its nose perfectly to the curve
    const rotationOffset = mode === "plane" ? 45 : 0;

    return (
        <g transform={`translate(${pos.x} ${pos.y}) rotate(${angleDeg + rotationOffset})`}>
            <circle r={18} fill="#ffffff" stroke="#333" strokeWidth={2} opacity={0.3} />
            <text textAnchor="middle" y={7} fontSize={22} style={{ userSelect: "none" }}>
                {getIcon()}
            </text>
        </g>
    );
};
