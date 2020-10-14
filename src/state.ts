import { Options } from './types';

import lodashGet from 'lodash/get';

export class BaseState {
  private _xValueRange: [number, number] | undefined = undefined;
  private _yValueRange: [number, number] | undefined = undefined;

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
    this.yValueRange = range;
  }
}
