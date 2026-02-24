import { geoMercator, geoPath, geoInterpolate, GeoProjection } from "d3-geo";
import type { LonLat } from "./types";

// Assumptions: The viewport frames Spain and the Canary Islands perfectly.
// Bounding box: [Min_Lon, Min_Lat], [Max_Lon, Max_Lat]
const REGION_BOUNDS: GeoJSON.Polygon = {
    type: "Polygon",
    coordinates: [[
        [-20, 26], // Bottom Left (South-West of Canaries)
        [5, 26],   // Bottom Right
        [5, 45],   // Top Right (North of Spain)
        [-20, 45], // Top Left
        [-20, 26],
    ]],
};

// Generates a map projection mathematically fitted to our required region & video dimension
export const createProjection = (width: number, height: number) => {
    return geoMercator().fitSize([width, height], REGION_BOUNDS);
};

export const createPathGenerator = (projection: GeoProjection) => {
    return geoPath(projection);
};

// Calculates a physically accurate spherical arc across the globe
export const getGreatCirclePath = (a: LonLat, b: LonLat, projection: GeoProjection, steps = 100): string => {
    const interp = geoInterpolate(a, b);
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
        const projected = projection(interp(i / steps) as [number, number]);
        if (projected) pts.push(projected);
    }

    if (pts.length === 0) return "";
    const [x0, y0] = pts[0];
    const commands = [`M ${x0} ${y0}`];
    for (let i = 1; i < pts.length; i++) {
        commands.push(`L ${pts[i][0]} ${pts[i][1]}`);
    }
    return commands.join(" ");
};

// A generic straight SVG line for ground transit (Bus/Car)
export const getStraightLinePath = (a: LonLat, b: LonLat, projection: GeoProjection): string => {
    const pA = projection(a);
    const pB = projection(b);
    if (!pA || !pB) return "";
    return `M ${pA[0]} ${pA[1]} L ${pB[0]} ${pB[1]}`;
};
