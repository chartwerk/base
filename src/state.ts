import { Options, TimeFormat, TickOrientation, ZoomType, ZoomOrientation, AxisFormat } from './types';

import lodashGet from 'lodash/get';

const DEFAULT_OPTIONS: Options = {
  confidence: 0,
  timeInterval: {
    timeFormat: TimeFormat.MINUTE
  },
  tickFormat: {
    xAxis: '%H:%M',
    xTickOrientation: TickOrientation.HORIZONTAL
  },
  zoom: {
    type: ZoomType.BRUSH,
    orientation: ZoomOrientation.HORIZONTAL
  },
  axis: {
    x: {
      format: AxisFormat.TIME
    },
    y: {
      format: AxisFormat.NUMERIC
    }
  },
  renderTicksfromTimestamps: false,
  renderYaxis: true,
  renderXaxis: true,
  renderGrid: true,
  renderLegend: true,
  renderCrosshair: true
}

const DEFAULT_TRANSFORM = {
  x: 0,
  y: 0,
  k: 1
}

export class PodState {
  private _xValueRange: [number, number] | undefined = undefined;
  private _yValueRange: [number, number] | undefined = undefined;
  private _transform: { x: number, y: number, k: number } = DEFAULT_TRANSFORM;

  constructor(
    options: Options
  ) {
    this._xValueRange = lodashGet(options, 'axis.x.range');
    this._yValueRange = lodashGet(options, 'axis.y.range');
  }

  get xValueRange(): [number, number] | undefined {
    return this._xValueRange;
  }

  get yValueRange(): [number, number] | undefined {
    return this._yValueRange;
  }

  set xValueRange(range: [number, number]) {
    this._xValueRange = range;
  }

  set yValueRange(range: [number, number]) {
    this._yValueRange = range;
  }
}
