import type { Itinerary } from "./types";

export const sampleItinerary: Itinerary = {
    title: "Granada to Lanzarote Trip",
    segments: [
        {
            id: "bus-granada-malaga",
            from: { id: "granada", name: "Granada", coord: [-3.5986, 37.1773] },
            to: { id: "malaga", name: "Málaga", coord: [-4.4991, 36.6749] },
            mode: "bus",
            durationInFrames: 60, // 2 seconds
            color: "#fbbf24" // Bright Yellow
        },
        {
            id: "flight-malaga-lanzarote",
            from: { id: "malaga", name: "Málaga", coord: [-4.4991, 36.6749] },
            to: { id: "lanzarote", name: "Lanzarote", coord: [-13.5962, 28.9416] },
            mode: "plane",
            durationInFrames: 120, // 4 seconds flight over ocean
            color: "#38bdf8" // Light Sky Blue
        }
    ]
};
