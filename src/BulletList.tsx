import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const BulletItem: React.FC<{
    text: string;
    delay: number;
    icon?: React.ReactNode;
}> = ({ text, delay, icon }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Animate entry with a spring
    const entrance = spring({
        frame: frame - delay,
        fps,
        config: {
            damping: 12,
            stiffness: 100, // slightly bouncy
        },
    });

    // Interpolate values for a "fancy" effect
    const translateY = interpolate(entrance, [0, 1], [50, 0]);
    const opacity = interpolate(entrance, [0, 1], [0, 1]);
    const scale = interpolate(entrance, [0, 1], [0.8, 1]);

    return (
        <div
            style={{
                transform: `translateY(${translateY}px) scale(${scale})`,
                opacity,
            }}
            className="flex items-center gap-6 mb-8"
        >
            <div className="w-12 h-12 flex items-center justify-center bg-blue-500 rounded-full shadow-lg text-white text-2xl font-bold">
                {icon || "•"}
            </div>
            <span className="text-6xl font-bold text-slate-800 drop-shadow-md font-[sans-serif]">
                {text}
            </span>
        </div>
    );
};

export const BulletList: React.FC = () => {
    const items = ["Vuelos", "Alojamientos", "Actividades", "Itinerario"];

    // Stagger items by 15 frames (0.5s at 30fps)
    const staggerFrames = 15;

    return (
        <AbsoluteFill className="justify-center items-center bg-transparent">
            <div className="flex flex-col items-start justify-center h-full">
                {items.map((item, index) => (
                    <BulletItem
                        key={index}
                        text={item}
                        delay={index * staggerFrames}
                        icon={<span>{index + 1}</span>}
                    />
                ))}
            </div>
        </AbsoluteFill>
    );
};
