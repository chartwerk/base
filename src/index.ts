import VueChartwerkBaseMixin from './VueChartwerkBaseMixin';
import { BaseState } from './state';

import styles from './css/style.css';

import { Margin, TimeSerie, Options, TickOrientation, TimeFormat, ZoomOrientation, ZoomType, AxisFormat, CrosshairOrientation } from './types';
import { uid } from './utils';
import { palette } from './colors';

// we import only d3 types here
import * as d3 from 'd3';

import defaults from 'lodash/defaults';
import includes from 'lodash/includes';
import first from 'lodash/first';
import last from 'lodash/last';
import mergeWith from 'lodash/mergeWith';
import min from 'lodash/min';
import minBy from 'lodash/minBy';
import max from 'lodash/max';
import maxBy from 'lodash/maxBy';
import add from 'lodash/add';
import replace from 'lodash/replace';
import reverse from 'lodash/reverse';
import sortBy from 'lodash/sortBy';


const DEFAULT_MARGIN: Margin = { top: 30, right: 20, bottom: 20, left: 30 };
const DEFAULT_TICK_COUNT = 4;
const MILISECONDS_IN_MINUTE = 60 * 1000;
const DEFAULT_AXIS_RANGE = [0, 1];
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
  crosshair: {
    orientation: CrosshairOrientation.VERTICAL,
    color: 'red'
  },
  renderTicksfromTimestamps: false,
  renderYaxis: true,
  renderXaxis: true,
  renderGrid: true,
  renderLegend: true,
  renderCrosshair: true,
  usePanning: true
}

abstract class ChartwerkBase<T extends TimeSerie, O extends Options> {
  protected _d3Node?: d3.Selection<HTMLElement, unknown, null, undefined>;
  protected _chartContainer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected _crosshair?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected _brush?: d3.BrushBehavior<unknown>;
  protected _zoom?: any;
  protected _svg?: d3.Selection<SVGElement, unknown, null, undefined>; 
  protected _state?: BaseState;
  protected _clipPath?: any;
  protected _isPanning = false;
  protected _isBrushing = false;
  private clipPathUID = '';

  constructor(
    // maybe it's not the best idea
    protected _d3: typeof d3,
    el: HTMLElement,
    protected _series: T[] = [],
    protected readonly _options: O
  ) {
    // TODO: test if it's necessary
    styles.use();

    // TODO: update defaults(we have defaults for option: { foo: ..., bar: ... }, user pass option: { foo: ... }, so bar has no defaults)
    defaults(this._options, DEFAULT_OPTIONS);
    // TODO: mb move it to render();
    this._initBaseState();
    this._d3Node = this._d3.select(el);
  }

  public render(): void {
    this._renderSvg();
    this._renderXAxis();
    this._renderYAxis();
    this._renderGrid();

    this._renderClipPath();
    this._useBrush();
    this._useScrollZoom();

    this._renderCrosshair();
    this._renderMetrics();

    this._renderLegend();
    this._renderYLabel();
    this._renderXLabel();
  }

  abstract _renderMetrics(): void;
  abstract onMouseOver(): void;
  abstract onMouseOut(): void;
  abstract onMouseMove(): void;
  public abstract renderSharedCrosshair(timestamp: number): void;
  public abstract hideSharedCrosshair(): void;

  _initBaseState() {
    this._state = new BaseState(this._options);
  }

  _renderSvg(): void {
    this._d3Node.select('svg').remove();
    this._svg = this._d3Node
      .append('svg')
      .style('width', '100%')
      .style('height', '100%')
      .style('backface-visibility', 'hidden');
    this._chartContainer = this._svg
      .append('g')
        .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
  }

  _renderGrid(): void {
    if(this._options.renderGrid === false) {
      return;
    }
    this._chartContainer.selectAll('.grid').remove();

    this._chartContainer
      .append('g')
      .attr('transform', `translate(0,${this.height})`)
      .attr('class', 'grid')
      .call(
        this.axisBottomWithTicks
          .tickSize(-this.height)
          .tickFormat(() => '')
      );

    this._chartContainer
      .append('g')
      .attr('class', 'grid')
      .call(
        this._d3.axisLeft(this.yScale).ticks(DEFAULT_TICK_COUNT)
          .tickSize(-this.width)
          .tickFormat(() => '')
      );

    this._chartContainer.selectAll('.grid').selectAll('.tick')
      .attr('opacity', '0.5');

    this._chartContainer.selectAll('.grid').select('.domain')
      .style('pointer-events', 'none');
  }

  _renderXAxis(): void {
    if(this._options.renderXaxis === false) {
      return;
    }
    this._chartContainer.select('#x-axis-container').remove();
    this._chartContainer
      .append('g')
      .attr('transform', `translate(0,${this.height})`)
      .attr('id', 'x-axis-container')
      .call(
        this.axisBottomWithTicks
          .tickSize(2)
          .tickFormat(this.xAxisTicksFormat)
      );
    this._chartContainer.select('#x-axis-container').selectAll('.tick').selectAll('text')
      .style('transform', this.xTickTransform);
  }

  _renderYAxis(): void {
    if(this._options.renderYaxis === false) {
      return;
    }
    this._chartContainer.select('#y-axis-container').remove();
    this._chartContainer
      .append('g')
      .attr('id', 'y-axis-container')
      // TODO: number of ticks shouldn't be hardcoded
      .call(
        this._d3.axisLeft(this.yScale).ticks(DEFAULT_TICK_COUNT)
          .tickSize(2)
      );
  }

  _renderCrosshair(): void {
    if(this._options.renderYaxis === false) {
      return;
    }
    this._crosshair = this._chartContainer.append('g')
      .attr('id', 'crosshair-container')
      .style('display', 'none');

    if(
      this._options.crosshair.orientation === CrosshairOrientation.VERTICAL ||
      this._options.crosshair.orientation === CrosshairOrientation.BOTH
    ) {
      this._crosshair.append('line')
        .attr('class', 'crosshair-line')
        .attr('id', 'crosshair-line-x')
        .attr('fill', this._options.crosshair.color)
        .attr('stroke', this._options.crosshair.color)
        .attr('stroke-width', '1px')
        .attr('y1', 0)
        .attr('y2', this.height)
        .style('pointer-events', 'none');
    }
    if(
      this._options.crosshair.orientation === CrosshairOrientation.HORIZONTAL ||
      this._options.crosshair.orientation === CrosshairOrientation.BOTH
    ) {
      this._crosshair.append('line')
        .attr('class', 'crosshair-line')
        .attr('id', 'crosshair-line-y')
        .attr('fill', this._options.crosshair.color)
        .attr('stroke', this._options.crosshair.color)
        .attr('stroke-width', '1px')
        .attr('x1', 0)
        .attr('x2', this.width)
        .style('pointer-events', 'none');
    }

    this._crosshair.append('circle')
      .attr('class', `crosshair-circle crosshair-background`)
      .attr('r', 9)
      .attr('clip-path', `url(#${this.rectClipId})`)
      .style('opacity', 0.3)
      .style('display', 'none')
      .style('pointer-events', 'none');
  }

  _useBrush(): void {
    if(this._options.zoom === undefined && this._options.zoom.type !== ZoomType.BRUSH) {
      return;
    }
    switch(this._options.zoom.orientation) {
      case ZoomOrientation.VERTICAL:
        this._brush = this._d3.brushY();
        break;
      case ZoomOrientation.HORIZONTAL:
        this._brush = this._d3.brushX();
        break;
      case ZoomOrientation.BOTH:
        this._brush = this._d3.brush();
        break;
      default:
        this._brush = this._d3.brushX();
    }
    this._brush.extent([
        [0, 0],
        [this.width, this.height]
      ])
      .handleSize(20)
      .filter(() => !this._d3.event.shiftKey)
      .on('start', this.onBrushStart.bind(this))
      .on('end', this.onBrushEnd.bind(this))

    const pan = this._d3.zoom()
      .filter(() => this._d3.event.shiftKey)
      .on('zoom', () => {
        this._onPanningZoom(this._d3.event);
      })
      .on('end', () => {
        this._onPanningEnd();
      });

    this._chartContainer
      .call(this._brush)
      .on('mouseover', this.onMouseOver.bind(this))
      .on('mouseout', this.onMouseOut.bind(this))
      .on('mousemove', this.onMouseMove.bind(this))
      .on('dblclick', this.zoomOut.bind(this));

    if(this._options.usePanning === true) {
      this._chartContainer.call(pan);
    }
  }

  _useScrollZoom(): void {
    if(this._options.zoom.type !== ZoomType.SCROLL) {
      return;
    }
    this._zoom = this._d3.zoom();
    this._zoom
      .scaleExtent([0.5, Infinity])
      .on('zoom', this.scrollZoomed.bind(this));

    this._svg
      .call(this._zoom);
  }

  _renderClipPath(): void {
    this._clipPath = this._chartContainer.append('defs').append('SVG:clipPath')
      .attr('id', this.rectClipId)
      .append('SVG:rect')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('x', 0)
      .attr('y', 0);
  }

  _renderLegend(): void {
    if(this._options.renderLegend === false) {
      return;
    }
    if(this._series.length > 0) {
      let legendRow = this._chartContainer
        .append('g')
        .attr('class', 'legend-row');
      for(let idx = 0; idx < this._series.length; idx++) {
        if(includes(this.seriesTargetsWithBounds, this._series[idx].target)) {
          continue;
        }
        let node = legendRow.selectAll('text').node();
        let rowWidth = 0;
        if(node !== null) {
          rowWidth = legendRow.node().getBBox().width + 25;
        }

        const isChecked = this._series[idx].visible !== false;
        legendRow.append('foreignObject')
          .attr('x', rowWidth)
          .attr('y', this.legendRowPositionY - 12)
          .attr('width', 13)
          .attr('height', 15)
          .html(`<form><input type=checkbox ${isChecked? 'checked' : ''} /></form>`)
          .on('click', () => {
            this._options.eventsCallbacks.onLegendClick(idx);
          });

        legendRow.append('text')
          .attr('x', rowWidth + 20)
          .attr('y', this.legendRowPositionY)
          .attr('class', `metric-legend-${idx}`)
          .style('font-size', '12px')
          .style('fill', this.getSerieColor(idx))
          .text(this._series[idx].target)
          .on('click', () => {
            this._options.eventsCallbacks.onLegendLabelClick(idx);
          });
      }
    }
  }

  _renderYLabel(): void {
    if(this._options.labelFormat === undefined || this._options.labelFormat.yAxis === undefined) {
      return;
    }
    this._chartContainer.append('text')
      .attr('y', 0 - this.margin.left)
      .attr('x', 0 - (this.height / 2))
      .attr('dy', '1em')
      .attr('class', 'y-axis-label')
      .attr('transform', 'rotate(-90)')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', 'currentColor')
      .text(this._options.labelFormat.yAxis);
  }

  _renderXLabel(): void {
    if(this._options.labelFormat === undefined || this._options.labelFormat.xAxis === undefined) {
      return;
    }
    let yPosition = this.height + this.margin.top + this.margin.bottom - 35;
    if(this._series.length === 0) {
      yPosition += 20;
    }
    this._chartContainer.append('text')
      .attr('class', 'x-axis-label')
      .attr('x', this.width / 2)
      .attr('y', yPosition)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', 'currentColor')
      .text(this._options.labelFormat.xAxis);
  }

  _renderNoDataPointsMessage(): void {
    this._chartContainer.append('text')
      .attr('class', 'alert-text')
      .attr('x', this.width / 2)
      .attr('y', this.height / 2)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', 'currentColor')
      .text('No data points');
  }

  _onPanningZoom(event: d3.D3ZoomEvent<any, any>) {
    const signX = Math.sign(event.transform.x);
    let signY = Math.sign(event.transform.y);
    if(this._options.axis.y.invert === true) {
      signY = -signY; // inversed, because d3 y-axis goes from top to bottom
    }
    const transformX = this.absXScale.invert(Math.abs(event.transform.x));
    const transformY = this.absYScale.invert(Math.abs(event.transform.y));
    const scale = event.transform.k;
    // TODO: lock scroll zoom
    // TODO: scroll zoom works bad if this.minValue !== 0
    this._state.xValueRange = [(this.minValueX - signX * transformX) / scale, (this.maxValueX - signX * transformX) / scale];
    this._state.yValueRange = [(this.minValue + signY * transformY) / scale, (this.maxValue + signY * transformY) / scale];

    this._chartContainer.select('.metrics-rect')
      .attr('transform', `translate(${event.transform.x},${event.transform.y}), scale(${event.transform.k})`);
    this._renderXAxis();
    this._renderYAxis();
    this._renderGrid();
    this._isPanning = true;
    this.onMouseOut();
  }

  _onPanningEnd() {
    this._isPanning = false;
    this.onMouseOut();
    console.log('on panning end, but there is no callback');
  }

  onBrushStart(): void {
    // TODO: move to state
    this._isBrushing === true;
    this.onMouseOut();
  }

  onBrushEnd(): void {
    const extent = this._d3.event.selection;
    this._isBrushing === false;
    if(extent === undefined || extent === null || extent.length < 2) {
      return;
    }
    this._chartContainer
      .call(this._brush.move, null);

    let xRange: [number, number];
    let yRange: [number, number];
    switch(this._options.zoom.orientation) {
      case ZoomOrientation.HORIZONTAL:
        const startTimestamp = this.xScale.invert(extent[0]);
        const endTimestamp = this.xScale.invert(extent[1]);
        if(Math.abs(endTimestamp - startTimestamp) < this.timeInterval) {
          return;
        }
        xRange = [startTimestamp, endTimestamp];
        this._state.xValueRange = xRange;
        break;
      case ZoomOrientation.VERTICAL:
        const upperY = this.yScale.invert(extent[0]);
        const bottomY = this.yScale.invert(extent[1]);
        // TODO: add min zoom y
        yRange = [upperY, bottomY];
        this._state.yValueRange = yRange;
        break;
      case ZoomOrientation.BOTH:
        const bothStartTimestamp = this.xScale.invert(extent[0][0]);
        const bothEndTimestamp = this.xScale.invert(extent[1][0]);
        const bothUpperY = this.yScale.invert(extent[0][1]);
        const bothBottomY = this.yScale.invert(extent[1][1]);
        xRange = [bothStartTimestamp, bothEndTimestamp];
        yRange = [bothUpperY, bothBottomY];
        this._state.xValueRange = xRange;
        this._state.yValueRange = yRange;
    }

    if(this._options.eventsCallbacks !== undefined && this._options.eventsCallbacks.zoomIn !== undefined) {
      this._options.eventsCallbacks.zoomIn([xRange, yRange]);
    } else {
      console.log('zoom in, but there is no callback');
    }
  }

  scrollZoomed(): void {
    this._chartContainer.selectAll('.scorecard').attr('transform', this._d3.event.transform);
  }

  zoomOut(): void {
    if(this.isOutOfChart() === true) {
      return;
    }
    let xAxisMiddleValue = this.xScale.invert(this.width / 2);
    if(this._options.eventsCallbacks !== undefined && this._options.eventsCallbacks.zoomOut !== undefined) {
      this._options.eventsCallbacks.zoomOut(xAxisMiddleValue as number);
    } else {
      console.log('zoom out, but there is no callback');
    }
  }

  get absXScale(): d3.ScaleLinear<number, number> {
    const domain = [0, Math.abs(this.maxValueX - this.minValueX)];
    return this._d3.scaleLinear()
      .domain(domain)
      .range([0, this.width]);
  }

  get absYScale(): d3.ScaleLinear<number, number> {
    const domain = [0, Math.abs(this.maxValue - this.minValue)];
    return this._d3.scaleLinear()
      .domain(domain)
      .range([0, this.height]);
  }

  get xScale(): d3.ScaleLinear<number, number> {
    const domain = this._state.xValueRange || [this.minValueX, this.maxValueX];
    return this._d3.scaleLinear()
      .domain(domain)
      .range([0, this.width]);
  }

  get yScale(): d3.ScaleLinear<number, number> {
    let domain = this._state.yValueRange || [this.maxValue, this.minValue];
    domain = sortBy(domain) as [number, number];
    if(this._options.axis.y.invert === true) {
      domain = reverse(domain);
    }
    return this._d3.scaleLinear()
      .domain(domain)
      .range([this.height, 0]); // inversed, because d3 y-axis goes from top to bottom
  }

  get minValue(): number {
    // y min value
    if(this.isSeriesUnavailable) {
      return DEFAULT_AXIS_RANGE[0];
    }
    if(this._options.axis.y !== undefined && this._options.axis.y.range !== undefined) {
      return min(this._options.axis.y.range)
    }
    const minValue = min(
      this._series
        .filter(serie => serie.visible !== false)
        .map(
          serie => minBy<number[]>(serie.datapoints, dp => dp[0])[0]
        )
    );
    return minValue;
  }

  get maxValue(): number {
    // y max value
    if(this.isSeriesUnavailable) {
      return DEFAULT_AXIS_RANGE[1];
    }
    if(this._options.axis.y !== undefined && this._options.axis.y.range !== undefined) {
      return max(this._options.axis.y.range)
    }
    const maxValue = max(
      this._series
        .filter(serie => serie.visible !== false)
        .map(
          serie => maxBy<number[]>(serie.datapoints, dp => dp[0])[0]
        )
    );
    return maxValue;
  }

  get minValueX(): number {
    if(this.isSeriesUnavailable) {
      return DEFAULT_AXIS_RANGE[0];
    }
    if(this._options.axis.x !== undefined && this._options.axis.x.range !== undefined) {
      return min(this._options.axis.x.range)
    }
    const minValue = min(
      this._series
        .filter(serie => serie.visible !== false)
        .map(
          serie => minBy<number[]>(serie.datapoints, dp => dp[1])[1]
        )
    );
    return minValue;
  }

  get maxValueX(): number {
    if(this.isSeriesUnavailable) {
      return DEFAULT_AXIS_RANGE[1];
    }
    if(this._options.axis.x !== undefined && this._options.axis.x.range !== undefined) {
      return max(this._options.axis.x.range)
    }
    const maxValue = max(
      this._series
        .filter(serie => serie.visible !== false)
        .map(
          serie => maxBy<number[]>(serie.datapoints, dp => dp[1])[1]
        )
    );
    return maxValue;
  }

  get axisBottomWithTicks(): d3.Axis<number | Date | { valueOf(): number }> {
    // TODO: find a better way
    if(this._options.renderTicksfromTimestamps === true) {
      return this._d3.axisBottom(this.xScale)
        .tickValues(this._series[0].datapoints.map(d => new Date(d[1])));
    }
    return this._d3.axisBottom(this.xScale).ticks(this.ticksCount);
  }

  get ticksCount(): d3.TimeInterval | number {
    if(this._options.timeInterval === undefined || this._options.timeInterval.count === undefined) {
      return 5;
    }
    // TODO: add max ticks limit
    switch(this._options.axis.x.format) {
      case AxisFormat.TIME:
        return this.getd3TimeRangeEvery(this._options.timeInterval.count);;
      case AxisFormat.NUMERIC:
        // TODO: find a better way
        return this._options.timeInterval.count;
      case AxisFormat.STRING:
      // TODO: add string/symbol format
      default:
        throw new Error(`Unknown time format for x-axis: ${this._options.axis.x.format}`);
    }
  }

  getd3TimeRangeEvery(count: number): d3.TimeInterval {
    if(this._options.timeInterval === undefined || this._options.timeInterval.timeFormat === undefined) {
      return this._d3.timeMinute.every(count);
    }
    switch(this._options.timeInterval.timeFormat) {
      case TimeFormat.SECOND:
        return this._d3.utcSecond.every(count);
      case TimeFormat.MINUTE:
        return this._d3.utcMinute.every(count);
      case TimeFormat.HOUR:
        return this._d3.utcHour.every(count);
      case TimeFormat.DAY:
        return this._d3.utcDay.every(count);
      case TimeFormat.MONTH:
        return this._d3.utcMonth.every(count);
      case TimeFormat.YEAR:
        return this._d3.utcYear.every(count);
      default:
        return this._d3.utcMinute.every(count);
    }
  }

  get serieTimestampRange(): number | undefined {
    if(this._series.length === 0) {
      return undefined;
    }
    const startTimestamp = first(this._series[0].datapoints)[1];
    const endTimestamp = last(this._series[0].datapoints)[1];
    return (endTimestamp - startTimestamp) / 1000;
  }

  get xAxisTicksFormat() {
    switch(this._options.axis.x.format) {
      case AxisFormat.TIME:
        if(this._options.tickFormat !== undefined && this._options.tickFormat.xAxis !== undefined) {
          return this._d3.timeFormat(this._options.tickFormat.xAxis);
        }
        return this._d3.timeFormat('%m/%d %H:%M');
      case AxisFormat.NUMERIC:
        return (d) => d;
      case AxisFormat.STRING:
        // TODO: add string/symbol format
      default:
        throw new Error(`Unknown time format for x-axis: ${this._options.axis.x.format}`);
    }
  }

  get timeInterval(): number {
    if(this._series !== undefined && this._series.length > 0 && this._series[0].datapoints.length > 1) {
      const interval = this._series[0].datapoints[1][1] - this._series[0].datapoints[0][1];
      return interval;
    }
    if(this._options.timeInterval !== undefined && this._options.timeInterval.count !== undefined) {
      //TODO: timeFormat to timestamp
      return this._options.timeInterval.count * MILISECONDS_IN_MINUTE;
    }
    return MILISECONDS_IN_MINUTE;
  }

  get xTickTransform(): string {
    if(this._options.tickFormat === undefined || this._options.tickFormat.xTickOrientation === undefined) {
      return '';
    }
    switch (this._options.tickFormat.xTickOrientation) {
      case TickOrientation.VERTICAL:
        return 'translate(-10px, 50px) rotate(-90deg)';
      case TickOrientation.HORIZONTAL:
        return '';
      case TickOrientation.DIAGONAL:
        return 'translate(-30px, 30px) rotate(-45deg)';
      default:
        return '';
    }
  }

  get extraMargin(): Margin {
    let optionalMargin = { top: 0, right: 0, bottom: 0, left: 0 };
    if(this._options.tickFormat !== undefined && this._options.tickFormat.xTickOrientation !== undefined) {
      switch (this._options.tickFormat.xTickOrientation) {
        case TickOrientation.VERTICAL:
          optionalMargin.bottom += 80;
          break;
        case TickOrientation.HORIZONTAL:
          break;
        case TickOrientation.DIAGONAL:
          optionalMargin.left += 15;
          optionalMargin.bottom += 50;
          optionalMargin.right += 10;
          break;
      }
    }
    if(this._options.labelFormat !== undefined) {
      if(this._options.labelFormat.xAxis !== undefined && this._options.labelFormat.xAxis.length > 0) {
        optionalMargin.bottom += 20;
      }
      if(this._options.labelFormat.yAxis !== undefined && this._options.labelFormat.yAxis.length > 0) {
        optionalMargin.left += 20;
      }
    }
    if(this._series.length > 0) {
      optionalMargin.bottom += 25;
    }
    return optionalMargin;
  }

  get width(): number {
    return this._d3Node.node().clientWidth - this.margin.left - this.margin.right;
  }

  get height(): number {
    return this._d3Node.node().clientHeight - this.margin.top - this.margin.bottom;
  }

  get legendRowPositionY(): number {
    return this.height + this.margin.bottom - 5;
  }

  get margin(): Margin {
    if(this._options.margin !== undefined) {
      return this._options.margin;
    }
    return mergeWith({}, DEFAULT_MARGIN, this.extraMargin, add);
  }

  get isSeriesUnavailable(): boolean {
    // TODO: Use one && throw error
    return this._series === undefined || this._series.length === 0 || this._series[0].datapoints.length === 0;
  }

  formatedBound(alias: string, target: string): string {
    const confidenceMetric = replace(alias, '$__metric_name', target);
    return confidenceMetric;
  }

  protected getSerieColor(idx: number): string {
    if(this._series[idx] === undefined) {
      throw new Error(
        `Can't get color for unexisting serie: ${idx}, there are only ${this._series.length} series`
      );
    }
    let serieColor = this._series[idx].color;
    if(serieColor === undefined) {
      serieColor = palette[idx % palette.length];
    }
    return serieColor;
  }

  get seriesTargetsWithBounds(): any[] {
    if(
      this._options.bounds === undefined ||
      this._options.bounds.upper === undefined ||
      this._options.bounds.lower === undefined
    ) {
      return [];
    }
    let series = [];
    this._series.forEach(serie => {
      series.push(this.formatedBound(this._options.bounds.upper, serie.target));
      series.push(this.formatedBound(this._options.bounds.lower, serie.target));
    });
    return series;
  }

  get visibleSeries(): any[] {
    return this._series.filter(serie => serie.visible !== false);
  }

  get rectClipId(): string {
    if(this.clipPathUID.length === 0) {
      this.clipPathUID = uid();
    }
    return this.clipPathUID;
  }

  isOutOfChart(): boolean {
    const event = this._d3.mouse(this._chartContainer.node());
    const eventX = event[0];
    const eventY = event[1];
    if(
      eventY > this.height + 1 || eventY < -1 ||
      eventX > this.width || eventX < 0
    ) {
      return true;
    }
    return false;
  }
}

export {
  ChartwerkBase, VueChartwerkBaseMixin,
  Margin, TimeSerie, Options, TickOrientation, TimeFormat, ZoomOrientation, ZoomType, AxisFormat,
  palette
};
