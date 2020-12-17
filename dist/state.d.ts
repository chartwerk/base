import { Options } from './types';
export declare class PodState {
    private _xValueRange;
    private _yValueRange;
    private _transform;
    constructor(options: Options);
    get xValueRange(): [number, number] | undefined;
    get yValueRange(): [number, number] | undefined;
    set xValueRange(range: [number, number]);
    set yValueRange(range: [number, number]);
}
