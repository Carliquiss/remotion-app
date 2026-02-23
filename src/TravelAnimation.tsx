import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from "remotion";
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import { Plane, Bus } from "lucide-react";
import React from "react";

// The topojson file path
const geoUrl = "/spain.json";

// Coordinates: [longitude, latitude]
const GRANADA = [-3.5986, 37.1773];
const MALAGA = [-4.4991, 36.6749]; // Malaga Airport approx
const LANZAROTE = [-13.5962, 28.9416]; // Arrecife Airport approx

export const TravelAnimation: React.FC = () => {
    const frame = useCurrentFrame();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars


    // Animation timeline breakdown:
    // 0 - 30: Bus from Granada to Malaga
    // 30 - 60: Plane boarding / pause at Malaga
    // 60 - 150: Plane flight to Lanzarote

    const busProgress = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
    const planeProgress = interpolate(frame, [60, 150], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
    });

    // Calculate current bus position
    const currentBusLong = interpolate(busProgress, [0, 1], [GRANADA[0], MALAGA[0]]);
    const currentBusLat = interpolate(busProgress, [0, 1], [GRANADA[1], MALAGA[1]]);

    // For the plane, we will use SVG path rendering to create a curve
    // and animate using strokeDashoffset or moving the marker.
    // Using react-simple-maps Line handles projection.
    // But to animate a marker ALONG the curved line is tricky with react-simple-maps natively.
    // Wait, react-simple-maps Marker is just an SVG element plotted to coordinates.
    // Let's interpolate linear coordinates for plane as well if we don't want a complex math curve,
    // or add a simple bezier curve.
    // For a cute vlog style, a dashed line with a plane icon interpolating points is fine.

    // Interpolating Plane position directly (Straight line on the projected map)
    // To make it curved, we can offset the latitude halfway
    const flightMidPointLong = (MALAGA[0] + LANZAROTE[0]) / 2;
    const flightMidPointLat = (MALAGA[1] + LANZAROTE[1]) / 2 + 3; // curve upwards

    // Quadratic bezier 1D interpolation function
    const bezier = (t: number, p0: number, p1: number, p2: number) => {
        return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    };

    const currentPlaneLong = bezier(planeProgress, MALAGA[0], flightMidPointLong, LANZAROTE[0]);
    const currentPlaneLat = bezier(planeProgress, MALAGA[1], flightMidPointLat, LANZAROTE[1]);

    return (
        <AbsoluteFill className="bg-sky-100 flex items-center justify-center">
            <div style={{ width: "100%", height: "100%", position: "relative" }}>
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: 2800,
                        center: [-6, 38], // Center to show mainland and Canary Islands
                    }}
                    style={{ width: "100%", height: "100%" }}
                >
                    {/* Map Base */}
                    <Geographies geography={geoUrl}>
                        {({ geographies }) =>
                            geographies.map((geo) => (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill="#FCD299" // Cute pastel yellow/orange
                                    stroke="#DEB887"
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

                    {/* Paths */}
                    <Line
                        from={GRANADA as [number, number]}
                        to={MALAGA as [number, number]}
                        stroke="#ff5e5e"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeDasharray="4 4"
                    // We can animate line drawing, but static dashed is okay for the background track
                    />

                    {/* Curved path for plane */}
                    {/* We fake it with SVG path directly on the SVG later, or just show the animated icon */}

                    {/* City Markers */}
                    <Marker coordinates={GRANADA as [number, number]}>
                        <circle r={6} fill="#ff5e5e" stroke="#fff" strokeWidth={2} />
                        <text textAnchor="middle" y={-10} style={{ fontFamily: "sans-serif", fontSize: "14px", fontWeight: "bold", fill: "#333" }}>
                            Granada
                        </text>
                    </Marker>
                    <Marker coordinates={MALAGA as [number, number]}>
                        <circle r={6} fill="#ff5e5e" stroke="#fff" strokeWidth={2} />
                        <text textAnchor="middle" y={20} style={{ fontFamily: "sans-serif", fontSize: "14px", fontWeight: "bold", fill: "#333" }}>
                            Málaga
                        </text>
                    </Marker>
                    <Marker coordinates={LANZAROTE as [number, number]}>
                        <circle r={6} fill="#ff5e5e" stroke="#fff" strokeWidth={2} />
                        <text textAnchor="middle" y={-10} style={{ fontFamily: "sans-serif", fontSize: "14px", fontWeight: "bold", fill: "#333" }}>
                            Lanzarote
                        </text>
                    </Marker>

                    {/* Animated Bus Icon */}
                    {frame <= 30 && (
                        <Marker coordinates={[currentBusLong, currentBusLat]}>
                            <g transform="translate(-12, -12)">
                                <Bus color="#374151" fill="#fff" size={24} />
                            </g>
                        </Marker>
                    )}

                    {/* Animated Plane Icon */}
                    {frame >= 30 && (
                        <Marker coordinates={[currentPlaneLong, currentPlaneLat]}>
                            <g transform="translate(-16, -16) rotate(-135)">
                                <Plane color="#3b82f6" fill="#60a5fa" size={32} />
                            </g>
                        </Marker>
                    )}

                </ComposableMap>
            </div>

            {/* Overlay Title */}
            <div className="absolute top-16 left-0 right-0 text-center flex flex-col items-center">
                <h1 className="text-5xl font-extrabold text-[#ff5e5e] mb-2 bg-white/70 px-8 py-4 rounded-3xl" style={{ fontFamily: 'sans-serif', textShadow: '2px 2px 0px white' }}>
                    Travel Vlog
                </h1>
                <h2 className="text-2xl font-bold border-2 border-[#ff5e5e] rounded-full px-6 py-2 bg-white text-[#ff5e5e]">
                    Granada ➔ Lanzarote
                </h2>
            </div>

        </AbsoluteFill>
    );
};
