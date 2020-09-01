export declare type Margin = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};
export declare type TimeSerie = {
    target: string;
    datapoints: [number, number][];
    alias?: string;
    visible?: boolean;
    color?: string;
};
export declare type Options = {
    margin?: Margin;
    confidence?: number;
    eventsCallbacks?: {
        zoomIn: (range: [number, number] | [[number, number], [number, number]]) => void;
        zoomOut: (center: number) => void;
        mouseMove: (evt: any) => void;
        mouseOut: () => void;
        onLegendClick: (idx: number) => void;
    };
    axis?: {
        x?: {
            format: AxisFormat;
        };
        y?: {
            format: AxisFormat;
        };
    };
    timeInterval?: {
        timeFormat?: TimeFormat;
        count?: number;
    };
    tickFormat?: {
        xAxis?: string;
        xTickOrientation?: TickOrientation;
    };
    labelFormat?: {
        xAxis?: string;
        yAxis?: string;
    };
    bounds?: {
        upper: string;
        lower: string;
    };
    timeRange?: {
        from: number;
        to: number;
    };
    zoom?: {
        type?: ZoomType;
        orientation?: ZoomOrientation;
        transform?: boolean;
        y?: [number, number];
        x?: [number, number];
    };
    renderTicksfromTimestamps?: boolean;
    renderYaxis?: boolean;
    renderXaxis?: boolean;
    renderGrid?: boolean;
    renderLegend?: boolean;
    renderCrosshair?: boolean;
};
export declare type VueOptions = Omit<Options, 'eventsCallbacks'>;
export declare enum TickOrientation {
    VERTICAL = "vertical",
    HORIZONTAL = "horizontal",
    DIAGONAL = "diagonal"
}
export declare enum TimeFormat {
    SECOND = "second",
    MINUTE = "minute",
    HOUR = "hour",
    DAY = "day",
    MONTH = "month",
    YEAR = "year"
}
export declare enum ZoomOrientation {
    VERTICAL = "vertical",
    HORIZONTAL = "horizontal",
    BOTH = "both"
}
export declare enum ZoomType {
    BRUSH = "brush",
    SCROLL = "scroll"
}
export declare enum AxisFormat {
    TIME = "time",
    NUMERIC = "numeric",
    STRING = "string"
}
