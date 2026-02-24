export type LonLat = [number, number];
export type TransportMode = "bus" | "plane" | "car" | "train";

export interface TravelLocation {
    id: string;
    name: string;
    coord: LonLat; // [longitude, latitude]
}

export interface TravelSegment {
    id: string;
    from: TravelLocation;
    to: TravelLocation;
    mode: TransportMode;
    durationInFrames: number;
    color?: string;
}

export interface Itinerary {
    title?: string;
    segments: TravelSegment[];
}
