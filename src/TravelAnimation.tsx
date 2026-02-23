import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from "remotion";
import React, { useMemo } from "react";
import { Plane, Bus } from "lucide-react";
import { geoMercator, geoPath } from "d3-geo";
// @ts-ignore
import { tile } from "d3-tile";

// Coordinates: [longitude, latitude]
const GRANADA: [number, number] = [-3.5986, 37.1773];
const MALAGA: [number, number] = [-4.4991, 36.6749];
const LANZAROTE: [number, number] = [-13.5962, 28.9416];

// Dimensions
const mapWidth = 1920;
const mapHeight = 1080;

// Base zoom values for d3-geo scale
const TIGHT_ZOOM = 420000;  // Seeing just the cities
const WIDE_ZOOM = 5000;     // Seeing the whole route to the Canaries
const PLANE_FOLLOW_ZOOM = 35000; // Medium zoom to follow the plane

export const TravelAnimation: React.FC = () => {
    const frame = useCurrentFrame();

    // 1. Bus path progress: Frames 0 - 30
    const busProgress = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

    // 2. Camera zoom & pan animation: Frames 30 - 70
    const cameraProgress = interpolate(frame, [30, 70], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease), // Smooth out easing
    });

    // 3. Plane flight: Frames 70 - 150
    const planeProgress = interpolate(frame, [70, 150], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
    });

    // Calculate dynamic vehicle positions
    const currentBusLong = interpolate(busProgress, [0, 1], [GRANADA[0], MALAGA[0]]);
    const currentBusLat = interpolate(busProgress, [0, 1], [GRANADA[1], MALAGA[1]]);

    const flightMidPointLong = (MALAGA[0] + LANZAROTE[0]) / 2 + 2;
    const flightMidPointLat = (MALAGA[1] + LANZAROTE[1]) / 2 + 2;

    const bezier = (t: number, p0: number, p1: number, p2: number) => {
        return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    };

    const currentPlaneLong = bezier(planeProgress, MALAGA[0], flightMidPointLong, LANZAROTE[0]);
    const currentPlaneLat = bezier(planeProgress, MALAGA[1], flightMidPointLat, LANZAROTE[1]);

    // Focus point selection
    const centerStart: [number, number] = [currentBusLong, currentBusLat];

    // Smooth interpolation for the center point while zooming out
    const transitionCenterLong = interpolate(cameraProgress, [0, 1], [centerStart[0], LANZAROTE[0]]);
    const transitionCenterLat = interpolate(cameraProgress, [0, 1], [centerStart[1], LANZAROTE[1]]);

    // Decide final center point depending on frame
    let currentCenterLong = transitionCenterLong;
    let currentCenterLat = transitionCenterLat;
    let currentScale = interpolate(cameraProgress, [0, 1], [TIGHT_ZOOM, PLANE_FOLLOW_ZOOM]);

    if (frame > 70) {
        // Track the plane directly and keep the zoom fixed at PLANE_FOLLOW_ZOOM
        currentCenterLong = currentPlaneLong;
        currentCenterLat = currentPlaneLat;
        currentScale = PLANE_FOLLOW_ZOOM;
    }

    // 1. Create the projection based on the current mathematically calculated center
    const projection = useMemo(() => {
        return geoMercator()
            .scale(currentScale)
            .center([currentCenterLong, currentCenterLat])
            .translate([mapWidth / 2, mapHeight / 2]);
    }, [currentScale, currentCenterLong, currentCenterLat]);

    // 2. Generate tiles based on the projection scale and translation
    const tilesData = useMemo(() => {
        const layout = tile()
            .size([mapWidth, mapHeight])
            .scale(projection.scale() * 2 * Math.PI)
            .translate(projection([0, 0]) as [number, number]);

        return layout();
    }, [projection]);

    // 3. Project our point coordinates to physical X/Y pixel values on the screen
    // Since projection can theoretically return null for weird out-of-bounds coords, we cast/fallback
    const projGranada = projection(GRANADA) || [0, 0];
    const projMalaga = projection(MALAGA) || [0, 0];
    const projLanzarote = projection(LANZAROTE) || [0, 0];
    const projBus = projection([currentBusLong, currentBusLat]) || [0, 0];
    const projPlane = projection([currentPlaneLong, currentPlaneLat]) || [0, 0];
    const projMidpoint = projection([flightMidPointLong, flightMidPointLat]) || [0, 0];

    // Plane Rotation Logic
    const bezierDerivative = (t: number, p0: number, p1: number, p2: number) => {
        return 2 * (1 - t) * (p1 - p0) + 2 * t * (p2 - p1);
    };

    // We calculate derivative on screen coordinates for accurate visual rotation!
    // Since the camera is moving, the physical X/Y path changes, but relative to the map it's fine.
    // For easiest rotation, calculate derivative on the pure Lon/Lat path
    const dxLon = bezierDerivative(planeProgress, MALAGA[0], flightMidPointLong, LANZAROTE[0]);
    const dyLat = bezierDerivative(planeProgress, MALAGA[1], flightMidPointLat, LANZAROTE[1]);

    // In Mercator, moving North (positive Lat) means moving UP visually (negative Y)
    let angleRad = Math.atan2(dyLat, dxLon);
    let angleDeg = angleRad * (180 / Math.PI);
    // Adjusting for the visual orientation (+90 or similar depending on the icon's default SVG orientation)
    // The lucide plane icon points roughly to Top-Right (45 degrees).
    const planeRotation = -angleDeg - 45 + 180;

    const GOOGLE_ROUTE = "#2563EB";

    return (
        <AbsoluteFill style={{ backgroundColor: "#0b0c10", overflow: "hidden" }}>

            {/* 1. RENDER MAP TILES */}
            <div style={{ position: "absolute", width: mapWidth, height: mapHeight }}>
                {tilesData.map((t: any) => {
                    // OpenStreetMap typical tile URL
                    // Note: In real production videos you should host your own tiles, or use Mapbox/Carto APIs to prevent IP blocking
                    const url = `https://a.tile.openstreetmap.org/${t.z}/${t.x}/${t.y}.png`;
                    return (
                        <img
                            key={`${t.z}-${t.x}-${t.y}`}
                            src={url}
                            style={{
                                position: "absolute",
                                left: Math.round((t.x + tilesData.translate[0]) * tilesData.scale),
                                top: Math.round((t.y + tilesData.translate[1]) * tilesData.scale),
                                width: Math.ceil(tilesData.scale),
                                height: Math.ceil(tilesData.scale),
                                // Slight CSS tweak to make standard OSM dark or styled nicely if desired
                                filter: "saturate(0.6) opacity(0.8)",
                            }}
                            alt="Map tile"
                        />
                    );
                })}
            </div>

            {/* 2. RENDER ROUTES AND SVG ELEMENTS on top of the tiles */}
            <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
                <defs>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.4" />
                    </filter>
                </defs>

                {/* Bus Route Line */}
                <path
                    d={`M ${projGranada[0]} ${projGranada[1]} L ${projMalaga[0]} ${projMalaga[1]}`}
                    fill="none"
                    stroke={GOOGLE_ROUTE}
                    strokeWidth={8}
                    strokeLinecap="round"
                    filter="url(#shadow)"
                />

                {/* Plane Route Line (Bezier curved) */}
                <path
                    d={`M ${projMalaga[0]} ${projMalaga[1]} Q ${projMidpoint[0]} ${projMidpoint[1]} ${projLanzarote[0]} ${projLanzarote[1]}`}
                    fill="none"
                    stroke="#9ca3af" // Gray dashes for flight
                    strokeWidth={6}
                    strokeDasharray="16 16"
                    strokeLinecap="round"
                />

                {/* City Markers */}
                <g>
                    <circle cx={projGranada[0]} cy={projGranada[1]} r={8} fill={GOOGLE_ROUTE} stroke="#fff" strokeWidth={3} filter="url(#shadow)" />
                    <text x={projGranada[0] - 16} y={projGranada[1] + 6} textAnchor="end" style={{ fontFamily: "sans-serif", fontSize: "28px", fontWeight: "800", fill: "#111", textShadow: "2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff" }}>
                        Granada
                    </text>
                </g>
                <g>
                    <circle cx={projMalaga[0]} cy={projMalaga[1]} r={8} fill={GOOGLE_ROUTE} stroke="#fff" strokeWidth={3} filter="url(#shadow)" />
                    <text x={projMalaga[0] + 16} y={projMalaga[1] + 6} textAnchor="start" style={{ fontFamily: "sans-serif", fontSize: "28px", fontWeight: "800", fill: "#111", textShadow: "2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff" }}>
                        Málaga
                    </text>
                </g>
                <g>
                    <circle cx={projLanzarote[0]} cy={projLanzarote[1]} r={10} fill="#e11d48" stroke="#fff" strokeWidth={4} filter="url(#shadow)" />
                    <text x={projLanzarote[0] - 20} y={projLanzarote[1] + 8} textAnchor="end" style={{ fontFamily: "sans-serif", fontSize: "32px", fontWeight: "900", fill: "#e11d48", textShadow: "2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff" }}>
                        Lanzarote
                    </text>
                </g>
            </svg>

            {/* 3. HTML ICONS (easier to size and rotate than raw SVG sometimes) */}

            {/* Animated Bus Icon */}
            {frame <= 30 && (
                <div style={{
                    position: "absolute",
                    left: projBus[0],
                    top: projBus[1],
                    transform: "translate(-50%, -50%)", // Center icon perfectly on path
                    filter: "drop-shadow(0px 8px 12px rgba(0,0,0,0.5))"
                }}>
                    <div style={{ backgroundColor: "#fff", padding: "6px", borderRadius: "8px", border: "2px solid #ccc" }}>
                        <Bus color="#111" fill="#fff" size={32} />
                    </div>
                </div>
            )}

            {/* Animated Plane Icon */}
            {frame >= 70 && (
                <div style={{
                    position: "absolute",
                    left: projPlane[0],
                    top: projPlane[1],
                    // We rotate the actual container div!
                    transform: `translate(-50%, -50%) rotate(${planeRotation}deg)`,
                    filter: "drop-shadow(0px 12px 24px rgba(0,0,0,0.6))"
                }}>
                    <Plane color="#e11d48" fill="#e11d48" strokeWidth={1} size={96} />
                </div>
            )}

            {/* Overlay Title */}
            <div className="absolute top-16 left-0 right-0 text-center flex flex-col items-center pointer-events-none">
                <h1 className="text-5xl font-extrabold text-[#333] mb-4 bg-white/95 px-10 py-5 rounded-full shadow-2xl" style={{ fontFamily: 'sans-serif' }}>
                    Ruta: Granada ➔ Lanzarote
                </h1>
            </div>

        </AbsoluteFill>
    );
};
