import React, { useEffect, useState } from "react";
import { AbsoluteFill, staticFile, useDelayRender, useVideoConfig } from "remotion";
import { feature } from "topojson-client";
import type { FeatureCollection } from "geojson";
import { createPathGenerator } from "./geo";

import { GeoProjection } from "d3-geo";

export const MapLayer: React.FC<{ projection: GeoProjection }> = ({ projection }) => {
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

    const pathGen = createPathGenerator(projection);

    return (
        <AbsoluteFill style={{ backgroundColor: "#e0f2fe" }}> {/* Ocean Light Blue */}
            <svg width={width} height={height}>
                {geoData?.features.map((f, i) => (
                    <path
                        key={i}
                        d={pathGen(f) ?? ""}
                        fill="#ffffff" // Land White
                        stroke="#cbd5e1" // Light border
                        strokeWidth={1}
                    />
                ))}
            </svg>
        </AbsoluteFill>
    );
};
