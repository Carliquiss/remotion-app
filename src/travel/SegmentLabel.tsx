import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const SegmentLabel: React.FC<{ x: number; y: number; text: string; revealFrame: number }> = ({ x, y, text, revealFrame }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({
        fps,
        frame: frame - revealFrame,
        config: { damping: 14, mass: 0.8 },
    });

    if (frame < revealFrame) return null;

    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <circle cx={0} cy={0} r={6} fill="#ffffff" />
            <rect x={12} y={-16} width={text.length * 11 + 24} height={32} rx={6} fill="#ffffff" />
            <text x={24} y={5} fontSize={18} fontWeight="bold" fill="#0b1220">{text}</text>
        </g>
    );
};
