export type Margin = { top: number, right: number, bottom: number, left: number };
export type TimeSerie = {
  target: string,
  datapoints: [number, number][],
  alias?: string,
  visible?: boolean,
  color?: string
};
// TODO: move some options to line-chart
export type Options = {
  margin?: Margin;
  confidence?: number;
  eventsCallbacks?: {
    zoomIn: (range: [number, number] | [[number, number], [number, number]]) => void,
    zoomOut: (center: number) => void,
    mouseMove: (evt: any) => void,
    mouseOut: () => void,
    onLegendClick: (idx: number) => void
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
    from: number,
    to: number
  };
  zoom?: {
    type?: ZoomType;
    orientation?: ZoomOrientation;
    transform?: boolean;
    y?: [number, number],
    x?: [number, number]
  };
  renderTicksfromTimestamps?: boolean;
  renderYaxis?: boolean;
  renderXaxis?: boolean;
  renderGrid?: boolean;
  renderLegend?: boolean;
  renderCrosshair?: boolean;
};
export type VueOptions = Omit<Options, 'eventsCallbacks'>;
export enum TickOrientation {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal',
  DIAGONAL = 'diagonal'
}
export enum TimeFormat {
  SECOND = 'second',
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year'
}
export enum ZoomOrientation {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal',
  BOTH = 'both'
}
export enum ZoomType {
  BRUSH = 'brush',
  SCROLL = 'scroll'
}
