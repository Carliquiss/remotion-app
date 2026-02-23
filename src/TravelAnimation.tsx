import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from "remotion";
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import { Plane, Bus } from "lucide-react";
import React from "react";

// The topojson file path
const geoUrl = "/spain.json";

// Coordinates: [longitude, latitude]
const GRANADA: [number, number] = [-3.5986, 37.1773];
const MALAGA: [number, number] = [-4.4991, 36.6749];
const LANZAROTE: [number, number] = [-13.5962, 28.9416];

export const TravelAnimation: React.FC = () => {
    const frame = useCurrentFrame();

    // 1. Bus path progress: Frames 0 - 30
    const busProgress = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

    // 2. Camera zoom & pan animation: Frames 30 - 70
    // Camera moves from zoomed-in on Granada/Málaga down to revealing full Spain+Canaries map
    const cameraProgress = interpolate(frame, [30, 70], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
    });

    // 3. Plane flight: Frames 70 - 150
    const planeProgress = interpolate(frame, [70, 150], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
    });

    // Current Bus position
    const currentBusLong = interpolate(busProgress, [0, 1], [GRANADA[0], MALAGA[0]]);
    const currentBusLat = interpolate(busProgress, [0, 1], [GRANADA[1], MALAGA[1]]);

    // Current Plane position (Quadratic bezier curve over the Atlantic)
    const flightMidPointLong = (MALAGA[0] + LANZAROTE[0]) / 2 + 2; // bulge out to sea slightly
    const flightMidPointLat = (MALAGA[1] + LANZAROTE[1]) / 2 + 2;

    const bezier = (t: number, p0: number, p1: number, p2: number) => {
        return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    };

    const currentPlaneLong = bezier(planeProgress, MALAGA[0], flightMidPointLong, LANZAROTE[0]);
    const currentPlaneLat = bezier(planeProgress, MALAGA[1], flightMidPointLat, LANZAROTE[1]);

    // Target camera centers
    const zoomInCenter: [number, number] = [(GRANADA[0] + MALAGA[0]) / 2, (GRANADA[1] + MALAGA[1]) / 2];
    const zoomOutCenter: [number, number] = [-6, 37.5]; // Perfect center for 16:9 view

    // Current camera projection properties
    const currentCenterLong = interpolate(cameraProgress, [0, 1], [zoomInCenter[0], zoomOutCenter[0]]);
    const currentCenterLat = interpolate(cameraProgress, [0, 1], [zoomInCenter[1], zoomOutCenter[1]]);
    // Base scale is much higher for 16:9 (1920x1080).
    const currentScale = interpolate(cameraProgress, [0, 1], [40000, 4800]);

    // Google Maps Style Palette
    const GOOGLE_WATER = "#AADAFF";
    const GOOGLE_LAND = "#EBEBE6";
    const GOOGLE_BORDER = "#DADBDA";
    const GOOGLE_ROUTE = "#2563EB"; // Blue line for directions

    return (
        <AbsoluteFill style={{ backgroundColor: GOOGLE_WATER, position: "relative" }}>
            {/* Soft drop shadow on map to give it a nice realistic depth layer */}
            <div style={{ position: "absolute", inset: 0, filter: "drop-shadow(0px 8px 16px rgba(0,0,0,0.15))" }}>
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: currentScale,
                        center: [currentCenterLong, currentCenterLat],
                    }}
                    style={{ width: "100%", height: "100%" }}
                >
                    <Geographies geography={geoUrl}>
                        {({ geographies }) =>
                            geographies.map((geo) => (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill={GOOGLE_LAND}
                                    stroke={GOOGLE_BORDER}
                                    strokeWidth={0.5}
                                    style={{
                                        default: { outline: "none" },
                                        hover: { outline: "none" },
                                        pressed: { outline: "none" },
                                    }}
                                />
                            ))
                        }
                    </Geographies>

                    {/* Bus Route Line */}
                    <Line
                        from={GRANADA}
                        to={MALAGA}
                        stroke={GOOGLE_ROUTE}
                        strokeWidth={4}
                        strokeLinecap="round"
                    />

                    {/* Plane Route Line */}
                    <Line
                        from={MALAGA}
                        to={LANZAROTE}
                        stroke="#9ca3af" // Gray dashes for flight
                        strokeWidth={3}
                        strokeDasharray="8 8"
                    />

                    {/* Markers */}
                    <Marker coordinates={GRANADA}>
                        <circle r={3} fill={GOOGLE_ROUTE} stroke="#fff" strokeWidth={1} />
                        <text textAnchor="end" x={-8} y={3} style={{ fontFamily: "sans-serif", fontSize: "14px", fontWeight: "600", fill: "#333", textShadow: "1px 1px 0 #fff, -1px -1px 0 #fff" }}>
                            Granada
                        </text>
                    </Marker>
                    <Marker coordinates={MALAGA}>
                        <circle r={3} fill={GOOGLE_ROUTE} stroke="#fff" strokeWidth={1} />
                        <text textAnchor="start" x={8} y={3} style={{ fontFamily: "sans-serif", fontSize: "14px", fontWeight: "600", fill: "#333", textShadow: "1px 1px 0 #fff, -1px -1px 0 #fff" }}>
                            Málaga
                        </text>
                    </Marker>
                    <Marker coordinates={LANZAROTE}>
                        <circle r={4} fill="#e11d48" stroke="#fff" strokeWidth={2} />
                        <text textAnchor="end" x={-10} y={4} style={{ fontFamily: "sans-serif", fontSize: "16px", fontWeight: "bold", fill: "#333", textShadow: "1px 1px 0 #fff, -1px -1px 0 #fff" }}>
                            Lanzarote
                        </text>
                    </Marker>

                    {/* Animated Bus Icon */}
                    {frame <= 30 && (
                        <Marker coordinates={[currentBusLong, currentBusLat]}>
                            <g transform="translate(-10, -10)">
                                <Bus color="#111" fill="#fff" size={20} />
                            </g>
                        </Marker>
                    )}

                    {/* Animated Plane Icon */}
                    {frame >= 70 && (
                        <Marker coordinates={[currentPlaneLong, currentPlaneLat]}>
                            {/* Note: we rotate the plane to point over the ocean towards Lanzarote (aprox -135deg) */}
                            <g transform="translate(-16, -16) rotate(-110)">
                                <Plane color="#e11d48" fill="#fff" size={32} />
                            </g>
                        </Marker>
                    )}

                </ComposableMap>
            </div>

            {/* Overlay Title */}
            <div className="absolute top-16 left-0 right-0 text-center flex flex-col items-center">
                <h1 className="text-5xl font-extrabold text-[#333] mb-4 bg-white/90 px-8 py-4 rounded-full shadow-lg" style={{ fontFamily: 'sans-serif' }}>
                    Ruta: Granada ➔ Lanzarote
                </h1>
            </div>

        </AbsoluteFill>
    );
};
