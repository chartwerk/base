export type Margin = { top: number, right: number, bottom: number, left: number };
export type TimeSerie = { target: string, alias: string, datapoints: [number, number][] };
// TODO: move some options to line-chart
export type Options = {
  margin?: Margin;
  colors?: string[];
  confidence?: number;
  eventsCallbacks?: {
    zoomIn: (range: [number, number]) => void,
    zoomOut: (center: number) => void,
    mouseMove: (evt: any) => void,
    mouseOut: () => void
  };
  timeInterval?: number;
  tickFormat?: {
    xAxis?: string;
    xTickOrientation?: TickOrientation;
  };
  labelFormat?: {
    xAxis?: string;
    yAxis?: string;
  };
};
export enum TickOrientation {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal',
  DIAGONAL = 'diagonal'
}
