import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const SegmentLabel: React.FC<{
    x: number;
    y: number;
    text: string;
    revealFrame: number;
    color?: string;
    align?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "right";
}> = ({ x, y, text, revealFrame, color = "#fef08a", align = "right" }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({
        fps,
        frame: frame - revealFrame,
        config: { damping: 14, mass: 0.8 },
    });

    if (frame < revealFrame) return null;

    // Approximate width based on character count and font size
    const fontSize = 28;
    const paddingX = 24;
    const paddingY = 16;
    const charWidth = fontSize * 0.6; // average char width ratio
    const boxWidth = text.length * charWidth + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;
    const borderRadius = 12;

    let translateX = 16;
    let translateY = -boxHeight / 2;

    switch (align) {
        case "top-left":
            translateX = -boxWidth - 16;
            translateY = -boxHeight - 8;
            break;
        case "top-right":
            translateX = 16;
            translateY = -boxHeight - 8;
            break;
        case "bottom-left":
            translateX = -boxWidth - 16;
            translateY = 8;
            break;
        case "bottom-right":
            translateX = 16;
            translateY = 8;
            break;
        case "right":
        default:
            translateX = 16;
            translateY = -boxHeight / 2;
            break;
    }

    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            {/* The pointer dot */}
            <circle cx={0} cy={0} r={8} stroke="#ffffff" strokeWidth={3} fill="#0b1220" />

            {/* The label bubble */}
            <g transform={`translate(${translateX}, ${translateY})`}>
                {/* Bubble shadow */}
                <rect
                    x={2}
                    y={4}
                    width={boxWidth}
                    height={boxHeight}
                    rx={borderRadius}
                    fill="#000000"
                    fillOpacity={0.1}
                />
                <rect
                    x={0}
                    y={0}
                    width={boxWidth}
                    height={boxHeight}
                    rx={borderRadius}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={2}
                />
                <text
                    x={boxWidth / 2}
                    y={boxHeight / 2}
                    fontSize={fontSize}
                    fontWeight="800"
                    fill="#0f172a"
                    dominantBaseline="central"
                    textAnchor="middle"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em' }}
                >
                    {text}
                </text>
            </g>
        </g>
    );
};
