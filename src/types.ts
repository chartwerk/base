export type Margin = { top: number, right: number, bottom: number, left: number };
export type TimeSerie = { target: string, alias: string, datapoints: [number, number][], visible: boolean };
// TODO: move some options to line-chart
export type Options = {
  margin?: Margin;
  colors?: string[];
  confidence?: number;
  eventsCallbacks?: {
    zoomIn: (range: [number, number]) => void,
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
  renderBarLabels?: boolean;
  renderTicksfromTimestamps?: boolean;
  renderBrushing?: boolean;
  renderYaxis?: boolean;
  renderXaxis?: boolean;
  renderLegend?: boolean;
  renderCrosshair?: boolean;
};
export type VueOptions = Omit<Options, "eventsCallbacks">;
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
