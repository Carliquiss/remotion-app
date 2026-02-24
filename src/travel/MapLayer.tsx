import React, { useEffect, useState } from "react";
import { AbsoluteFill, staticFile, useDelayRender, useVideoConfig } from "remotion";
import { feature } from "topojson-client";
import type { FeatureCollection } from "geojson";
import { createProjection, createPathGenerator } from "./geo";

export const MapLayer: React.FC = () => {
    const { width, height } = useVideoConfig();
    const { delayRender, continueRender } = useDelayRender();
    const [handle] = useState(() => delayRender("Loading map topology"));
    const [geoData, setGeoData] = useState<FeatureCollection | null>(null);

    useEffect(() => {
        // Fetch TopoJSON stored in the Remotion public directory
        fetch(staticFile("maps/countries-50m.json"))
            .then((res) => res.json())
            .then((topo) => {
                // Convert TopoJSON to GeoJSON
                const landFc = feature(topo, topo.objects.countries) as unknown as FeatureCollection;
                setGeoData(landFc);
                continueRender(handle);
            })
            .catch((err) => {
                console.warn("Could not load topojson:", err);
                continueRender(handle);
            });
    }, [handle, continueRender]);

    const projection = createProjection(width, height);
    const pathGen = createPathGenerator(projection);

    return (
        <AbsoluteFill style={{ backgroundColor: "#0b1220" }}> {/* Ocean Dark Blue */}
            <svg width={width} height={height}>
                {geoData?.features.map((f, i) => (
                    <path
                        key={i}
                        d={pathGen(f) ?? ""}
                        fill="#111c33" // Land Dark Color
                        stroke="#243a6b"
                        strokeWidth={1}
                    />
                ))}
            </svg>
        </AbsoluteFill>
    );
};
