import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from "remotion";
import { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup } from "react-simple-maps";
import { Plane, Bus } from "lucide-react";
import React from "react";

// The topojson file path for the borders, just in case we want them over the tiles
const geoUrl = "/spain.json";

// Coordinates: [longitude, latitude]
const GRANADA: [number, number] = [-3.5986, 37.1773];
const MALAGA: [number, number] = [-4.4991, 36.6749];
const LANZAROTE: [number, number] = [-13.5962, 28.9416];

// Helper to convert Coordinates to Tile XYZ limits (roughly) for our custom visual integration
const mapWidth = 1920;
const mapHeight = 1080;

export const TravelAnimation: React.FC = () => {
    const frame = useCurrentFrame();

    // 1. Bus path progress: Frames 0 - 30
    const busProgress = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

    // 2. Camera zoom & pan animation: Frames 30 - 70
    // Camera moves from zoomed-in on Granada/Málaga down to revealing full Spain+Canaries map
    const cameraProgress = interpolate(frame, [30, 70], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease), // Smooth out easing
    });

    // 3. Plane flight: Frames 70 - 150
    // We delay the plane slightly so it starts right when the camera zoom-out finishes
    const planeProgress = interpolate(frame, [70, 150], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
    });

    // Calculate Current positions
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
    // Frames 0-30: Center strictly on the bus
    // Frames 30-70: Center interpolates from Bus to a wide view over the ocean
    // Frames 70-150: Center carefully trails the plane but keeps the map largely in view

    // Zoom levels for ZoomableGroup
    const TIGHT_ZOOM = 40;  // Very close
    const WIDE_ZOOM = 5;    // Seeing the whole route

    const currentZoom = interpolate(cameraProgress, [0, 1], [TIGHT_ZOOM, WIDE_ZOOM]);

    const centerStart: [number, number] = [currentBusLong, currentBusLat];

    // The point where the zoom-out concludes
    const centerMiddle: [number, number] = [(MALAGA[0] + LANZAROTE[0]) / 2, (MALAGA[1] + LANZAROTE[1]) / 2];

    // Smooth interpolation for the center point while zooming out
    const transitionCenterLong = interpolate(cameraProgress, [0, 1], [centerStart[0], centerMiddle[0]]);
    const transitionCenterLat = interpolate(cameraProgress, [0, 1], [centerStart[1], centerMiddle[1]]);

    // Decide final center point depending on frame
    let currentCenterLong = transitionCenterLong;
    let currentCenterLat = transitionCenterLat;

    if (frame > 70) {
        // As the plane flies, let the camera optionally drift to follow it slightly, 
        // to keep it from going out of bounds. Since we are at WIDE_ZOOM, we don't need much.
        const flightDrift = interpolate(planeProgress, [0, 1], [centerMiddle[0], LANZAROTE[0] + 2]);
        const flightDriftLat = interpolate(planeProgress, [0, 1], [centerMiddle[1], LANZAROTE[1]]);
        currentCenterLong = flightDrift;
        currentCenterLat = flightDriftLat;
    }

    const GOOGLE_ROUTE = "#2563EB";

    // Adding dynamic plane rotation so it faces where it's flying
    // Derivative of the bezier curve to find tangent angle
    const bezierDerivative = (t: number, p0: number, p1: number, p2: number) => {
        return 2 * (1 - t) * (p1 - p0) + 2 * t * (p2 - p1);
    };
    const dx = bezierDerivative(planeProgress, MALAGA[0], flightMidPointLong, LANZAROTE[0]);
    const dy = bezierDerivative(planeProgress, MALAGA[1], flightMidPointLat, LANZAROTE[1]);

    // dy goes up for positive lat, but SVG Y goes down. We adjust by doing -dy. 
    // Wait, on Mercator, Lat going down (towards equator) means Y going up.
    // So angle = atan2(dy, dx) using simple coords works roughly.
    let angleRad = Math.atan2(dy, dx);
    // Convert to degrees
    let angleDeg = angleRad * (180 / Math.PI);
    // The lucide-react "Plane" icon points pointing up and right by default (around 45deg).
    // We adjust it based on the visual angle.
    const planeRotation = -angleDeg - 45 + 180;

    return (
        <AbsoluteFill style={{ backgroundColor: "#AADAFF", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0 }}>
                {/* ComposableMap automatically handles SVG rendering. We use ZoomableGroup for smooth camera control. */}
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: 2000, // Base scale. The ZoomableGroup multiplies this by `zoom`
                        center: [0, 0] // We let ZoomableGroup handle the centering
                    }}
                    width={mapWidth}
                    height={mapHeight}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                >
                    <ZoomableGroup
                        zoom={currentZoom}
                        center={[currentCenterLong, currentCenterLat]}
                    // Disable interactions completely since it's a video
                    >
                        {/* 1. Realistic Map Base: 
                            Instead of standard colored vectors, we load the TopoJSON but style it lightly to ensure borders exist.
                            A pure tile server in React-Simple-Maps requires custom components. 
                            We will draw the geographies with realistic land color. 
                        */}
                        <Geographies geography={geoUrl}>
                            {({ geographies }) =>
                                geographies.map((geo) => (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill="#EBEBE6"
                                        stroke="#DADBDA"
                                        strokeWidth={0.5 / currentZoom} // Scale stroke down as we zoom in
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
                            strokeWidth={4 / Math.sqrt(currentZoom)} // Keep line somewhat thick but scale down
                            strokeLinecap="round"
                        />

                        {/* Plane Route Line */}
                        <Line
                            from={MALAGA}
                            to={LANZAROTE}
                            stroke="#9ca3af" // Gray dashes for flight
                            strokeWidth={3 / Math.sqrt(currentZoom)}
                            strokeDasharray={`${8 / currentZoom} ${8 / currentZoom}`}
                        />

                        {/* Markers */}
                        <Marker coordinates={GRANADA}>
                            <circle r={3 / currentZoom} fill={GOOGLE_ROUTE} stroke="#fff" strokeWidth={1 / currentZoom} />
                            <text textAnchor="end" x={-8 / currentZoom} y={3 / currentZoom} style={{ fontFamily: "sans-serif", fontSize: `${14 / currentZoom}px`, fontWeight: "600", fill: "#333" }}>
                                Granada
                            </text>
                        </Marker>
                        <Marker coordinates={MALAGA}>
                            <circle r={3 / currentZoom} fill={GOOGLE_ROUTE} stroke="#fff" strokeWidth={1 / currentZoom} />
                            <text textAnchor="start" x={8 / currentZoom} y={3 / currentZoom} style={{ fontFamily: "sans-serif", fontSize: `${14 / currentZoom}px`, fontWeight: "600", fill: "#333" }}>
                                Málaga
                            </text>
                        </Marker>
                        <Marker coordinates={LANZAROTE}>
                            <circle r={4 / currentZoom} fill="#e11d48" stroke="#fff" strokeWidth={2 / currentZoom} />
                            <text textAnchor="end" x={-10 / currentZoom} y={4 / currentZoom} style={{ fontFamily: "sans-serif", fontSize: `${16 / currentZoom}px`, fontWeight: "bold", fill: "#333" }}>
                                Lanzarote
                            </text>
                        </Marker>

                        {/* Animated Bus Icon */}
                        {frame <= 30 && (
                            <Marker coordinates={[currentBusLong, currentBusLat]}>
                                <g transform={`scale(${1 / currentZoom})`}>
                                    <g transform={`translate(-10, -10)`}>
                                        <Bus color="#111" fill="#fff" size={20} />
                                    </g>
                                </g>
                            </Marker>
                        )}

                        {/* Animated Plane Icon */}
                        {frame >= 70 && (
                            <Marker coordinates={[currentPlaneLong, currentPlaneLat]}>
                                <g transform={`scale(${2 / currentZoom}) rotate(${planeRotation})`}>
                                    <g transform={`translate(-16, -16)`}>
                                        <Plane color="#e11d48" fill="#fff" size={32} />
                                    </g>
                                </g>
                            </Marker>
                        )}

                    </ZoomableGroup>
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
