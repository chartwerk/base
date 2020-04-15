# Chartwerk Base

Plugin for basic data visualization.

## API

Plugin renders:
  - svg container for further visualization
  - Axis with ticks and labels
  - Grid, scales from timeinterval
  - Legend with option to enable/disable metric

Options:
  - margin: Margin;
  - colors: string[];
  - confidence: number;
  - eventsCallbacks: {
      zoomIn: (range: [number, number]) => void,
      zoomOut: (center: number) => void,
      mouseMove: (evt: any) => void,
      mouseOut: () => void,
      onLegendClick: (idx: number) => void
    };
  - timeInterval: number;
  - tickFormat: {
      xAxis?: string;
      xTickOrientation?: TickOrientation;
    };
  - labelFormat: {
      xAxis?: string;
      yAxis?: string;
    };
