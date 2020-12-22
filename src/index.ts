import VueChartwerkPodMixin from './VueChartwerkPodMixin';
import { PodState } from './state';

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
import cloneDeep from 'lodash/cloneDeep';


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

abstract class ChartwerkPod<T extends TimeSerie, O extends Options> {
  protected d3Node?: d3.Selection<HTMLElement, unknown, null, undefined>;
  protected chartContainer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected crosshair?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected brush?: d3.BrushBehavior<unknown>;
  protected zoom?: any;
  protected svg?: d3.Selection<SVGElement, unknown, null, undefined>; 
  protected state?: PodState;
  protected clipPath?: any;
  protected isPanning = false;
  protected isBrushing = false;
  private _clipPathUID = '';
  protected readonly options: O;
  protected readonly d3: typeof d3;

  constructor(
    // maybe it's not the best idea
    _d3: typeof d3,
    protected readonly el: HTMLElement,
    protected readonly series: T[] = [],
    _options: O
  ) {
    // TODO: test if it's necessary
    styles.use();

    let options = cloneDeep(_options);
    // TODO: update defaults(we have defaults for option: { foo: ..., bar: ... }, user pass option: { foo: ... }, so bar has no defaults)
    defaults(options, DEFAULT_OPTIONS);
    this.options = options;
    this.d3 = _d3;

    // TODO: mb move it to render();
    this.initPodState();
    this.d3Node = this.d3.select(this.el);
  }

  public render(): void {
    this.renderSvg();
    this.renderXAxis();
    this.renderYAxis();
    this.renderGrid();

    this.renderClipPath();
    this.useBrush();
    this.useScrollZoom();

    this.renderCrosshair();
    this.renderMetrics();

    this.renderLegend();
    this.renderYLabel();
    this.renderXLabel();
  }

  protected abstract renderMetrics(): void;
  protected abstract onMouseOver(): void;
  protected abstract onMouseOut(): void;
  protected abstract onMouseMove(): void;
  public abstract renderSharedCrosshair(timestamp: number): void;
  public abstract hideSharedCrosshair(): void;

  protected initPodState() {
    this.state = new PodState(this.options);
  }

  protected renderSvg(): void {
    this.d3Node.select('svg').remove();
    this.svg = this.d3Node
      .append('svg')
      .style('width', '100%')
      .style('height', '100%')
      .style('backface-visibility', 'hidden');
    this.chartContainer = this.svg
      .append('g')
        .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
  }

  protected renderGrid(): void {
    if(this.options.renderGrid === false) {
      return;
    }
    this.chartContainer.selectAll('.grid').remove();

    this.chartContainer
      .append('g')
      .attr('transform', `translate(0,${this.height})`)
      .attr('class', 'grid')
      .call(
        this.axisBottomWithTicks
          .tickSize(-this.height)
          .tickFormat(() => '')
      );

    this.chartContainer
      .append('g')
      .attr('class', 'grid')
      .call(
        this.d3.axisLeft(this.yScale).ticks(DEFAULT_TICK_COUNT)
          .tickSize(-this.width)
          .tickFormat(() => '')
      );

    this.chartContainer.selectAll('.grid').selectAll('.tick')
      .attr('opacity', '0.5');

    this.chartContainer.selectAll('.grid').select('.domain')
      .style('pointer-events', 'none');
  }

  protected renderXAxis(): void {
    if(this.options.renderXaxis === false) {
      return;
    }
    this.chartContainer.select('#x-axis-container').remove();
    this.chartContainer
      .append('g')
      .attr('transform', `translate(0,${this.height})`)
      .attr('id', 'x-axis-container')
      .call(
        this.axisBottomWithTicks
          .tickSize(2)
          .tickFormat(this.xAxisTicksFormat)
      );
    this.chartContainer.select('#x-axis-container').selectAll('.tick').selectAll('text')
      .style('transform', this.xTickTransform);
  }

  protected renderYAxis(): void {
    if(this.options.renderYaxis === false) {
      return;
    }
    this.chartContainer.select('#y-axis-container').remove();
    this.chartContainer
      .append('g')
      .attr('id', 'y-axis-container')
      // TODO: number of ticks shouldn't be hardcoded
      .call(
        this.d3.axisLeft(this.yScale).ticks(DEFAULT_TICK_COUNT)
          .tickSize(2)
      );
  }

  protected renderCrosshair(): void {
    if(this.options.renderYaxis === false) {
      return;
    }
    this.crosshair = this.chartContainer.append('g')
      .attr('id', 'crosshair-container')
      .style('display', 'none');

    if(
      this.options.crosshair.orientation === CrosshairOrientation.VERTICAL ||
      this.options.crosshair.orientation === CrosshairOrientation.BOTH
    ) {
      this.crosshair.append('line')
        .attr('class', 'crosshair-line')
        .attr('id', 'crosshair-line-x')
        .attr('fill', this.options.crosshair.color)
        .attr('stroke', this.options.crosshair.color)
        .attr('stroke-width', '1px')
        .attr('y1', 0)
        .attr('y2', this.height)
        .style('pointer-events', 'none');
    }
    if(
      this.options.crosshair.orientation === CrosshairOrientation.HORIZONTAL ||
      this.options.crosshair.orientation === CrosshairOrientation.BOTH
    ) {
      this.crosshair.append('line')
        .attr('class', 'crosshair-line')
        .attr('id', 'crosshair-line-y')
        .attr('fill', this.options.crosshair.color)
        .attr('stroke', this.options.crosshair.color)
        .attr('stroke-width', '1px')
        .attr('x1', 0)
        .attr('x2', this.width)
        .style('pointer-events', 'none');
    }
  }

  protected useBrush(): void {
    if(this.options.zoom === undefined || this.options.zoom.type !== ZoomType.BRUSH) {
      return;
    }
    switch(this.options.zoom.orientation) {
      case ZoomOrientation.VERTICAL:
        this.brush = this.d3.brushY();
        break;
      case ZoomOrientation.HORIZONTAL:
        this.brush = this.d3.brushX();
        break;
      case ZoomOrientation.BOTH:
        this.brush = this.d3.brush();
        break;
      default:
        this.brush = this.d3.brushX();
    }
    this.brush.extent([
        [0, 0],
        [this.width, this.height]
      ])
      .handleSize(20)
      .filter(() => !this.d3.event.shiftKey)
      .on('start', this.onBrushStart.bind(this))
      .on('end', this.onBrushEnd.bind(this))

    const pan = this.d3.zoom()
      .filter(() => this.d3.event.shiftKey)
      .on('zoom', () => {
        this.onPanningZoom(this.d3.event);
      })
      .on('end', () => {
        this.onPanningEnd();
      });

    this.chartContainer
      .call(this.brush)
      .on('mouseover', this.onMouseOver.bind(this))
      .on('mouseout', this.onMouseOut.bind(this))
      .on('mousemove', this.onMouseMove.bind(this))
      .on('dblclick', this.zoomOut.bind(this));

    if(this.options.usePanning === true) {
      this.chartContainer.call(pan);
    }
  }

  protected useScrollZoom(): void {
    if(this.options.zoom.type !== ZoomType.SCROLL) {
      return;
    }
    this.zoom = this.d3.zoom();
    this.zoom
      .scaleExtent([0.5, Infinity])
      .on('zoom', this.scrollZoomed.bind(this));

    this.svg.call(this.zoom);
  }

  protected renderClipPath(): void {
    this.clipPath = this.chartContainer.append('defs').append('SVG:clipPath')
      .attr('id', this.rectClipId)
      .append('SVG:rect')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('x', 0)
      .attr('y', 0);
  }

  protected renderLegend(): void {
    if(this.options.renderLegend === false) {
      return;
    }
    if(this.series.length > 0) {
      let legendRow = this.chartContainer
        .append('g')
        .attr('class', 'legend-row');
      for(let idx = 0; idx < this.series.length; idx++) {
        if(includes(this.seriesTargetsWithBounds, this.series[idx].target)) {
          continue;
        }
        let node = legendRow.selectAll('text').node();
        let rowWidth = 0;
        if(node !== null) {
          rowWidth = legendRow.node().getBBox().width + 25;
        }

        const isChecked = this.series[idx].visible !== false;
        legendRow.append('foreignObject')
          .attr('x', rowWidth)
          .attr('y', this.legendRowPositionY - 12)
          .attr('width', 13)
          .attr('height', 15)
          .html(`<form><input type=checkbox ${isChecked? 'checked' : ''} /></form>`)
          .on('click', () => {
            this.options.eventsCallbacks.onLegendClick(idx);
          });

        legendRow.append('text')
          .attr('x', rowWidth + 20)
          .attr('y', this.legendRowPositionY)
          .attr('class', `metric-legend-${idx}`)
          .style('font-size', '12px')
          .style('fill', this.getSerieColor(idx))
          .text(this.series[idx].target)
          .on('click', () => {
            this.options.eventsCallbacks.onLegendLabelClick(idx);
          });
      }
    }
  }

  protected renderYLabel(): void {
    if(this.options.labelFormat === undefined || this.options.labelFormat.yAxis === undefined) {
      return;
    }
    this.chartContainer.append('text')
      .attr('y', 0 - this.margin.left)
      .attr('x', 0 - (this.height / 2))
      .attr('dy', '1em')
      .attr('class', 'y-axis-label')
      .attr('transform', 'rotate(-90)')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', 'currentColor')
      .text(this.options.labelFormat.yAxis);
  }

  protected renderXLabel(): void {
    if(this.options.labelFormat === undefined || this.options.labelFormat.xAxis === undefined) {
      return;
    }
    let yPosition = this.height + this.margin.top + this.margin.bottom - 35;
    if(this.series.length === 0) {
      yPosition += 20;
    }
    this.chartContainer.append('text')
      .attr('class', 'x-axis-label')
      .attr('x', this.width / 2)
      .attr('y', yPosition)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', 'currentColor')
      .text(this.options.labelFormat.xAxis);
  }

  protected renderNoDataPointsMessage(): void {
    this.chartContainer.append('text')
      .attr('class', 'alert-text')
      .attr('x', this.width / 2)
      .attr('y', this.height / 2)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', 'currentColor')
      .text('No data points');
  }

  protected onPanningZoom(event: d3.D3ZoomEvent<any, any>) {
    // @ts-ignore
    const signX = Math.sign(event.transform.x);
    // @ts-ignore
    let signY = Math.sign(event.transform.y);
    if(this.options.axis.y.invert === true) {
      signY = -signY; // inversed, because d3 y-axis goes from top to bottom
    }
    const transformX = this.absXScale.invert(Math.abs(event.transform.x));
    const transformY = this.absYScale.invert(Math.abs(event.transform.y));
    const scale = event.transform.k;
    // TODO: lock scroll zoom or try zoom.identity
    // TODO: scroll zoom works bad if this.minValue !== 0
    // Here we use Zoom option, to determine witch axis will be panned. Options should be refactored
    let translateX = 0;
    let translateY = 0;
    switch (this.options.zoom.orientation) {
      case ZoomOrientation.HORIZONTAL:
        this.state.xValueRange = [(this.minValueX - signX * transformX) / scale, (this.maxValueX - signX * transformX) / scale];
        translateX = event.transform.x;
        break;
      case ZoomOrientation.VERTICAL:
        this.state.yValueRange = [(this.minValue + signY * transformY) / scale, (this.maxValue + signY * transformY) / scale];
        translateY = event.transform.y;
        break;
      case ZoomOrientation.BOTH:
        translateX = event.transform.x;
        translateY = event.transform.y;
        this.state.xValueRange = [(this.minValueX - signX * transformX) / scale, (this.maxValueX - signX * transformX) / scale];
        this.state.yValueRange = [(this.minValue + signY * transformY) / scale, (this.maxValue + signY * transformY) / scale];
    }

    this.chartContainer.select('.metrics-rect')
      .attr('transform', `translate(${translateX},${translateY}), scale(${event.transform.k})`);
    this.renderXAxis();
    this.renderYAxis();
    this.renderGrid();
    this.isPanning = true;
    this.onMouseOut();
  }

  protected onPanningEnd(): void {
    this.isPanning = false;
    this.onMouseOut();
    if(this.options.eventsCallbacks !== undefined && this.options.eventsCallbacks.panningEnd !== undefined) {
      this.options.eventsCallbacks.panningEnd([this.state.xValueRange, this.state.yValueRange]);
    } else {
      console.log('on panning end, but there is no callback');
    }
  }

  protected onBrushStart(): void {
    // TODO: move to state
    this.isBrushing === true;
    this.onMouseOut();
  }

  protected onBrushEnd(): void {
    const extent = this.d3.event.selection;
    this.isBrushing === false;
    if(extent === undefined || extent === null || extent.length < 2) {
      return;
    }
    this.chartContainer
      .call(this.brush.move, null);

    let xRange: [number, number];
    let yRange: [number, number];
    switch(this.options.zoom.orientation) {
      case ZoomOrientation.HORIZONTAL:
        const startTimestamp = this.xScale.invert(extent[0]);
        const endTimestamp = this.xScale.invert(extent[1]);
        if(Math.abs(endTimestamp - startTimestamp) < this.timeInterval) {
          return;
        }
        xRange = [startTimestamp, endTimestamp];
        this.state.xValueRange = xRange;
        break;
      case ZoomOrientation.VERTICAL:
        const upperY = this.yScale.invert(extent[0]);
        const bottomY = this.yScale.invert(extent[1]);
        // TODO: add min zoom y
        yRange = [upperY, bottomY];
        this.state.yValueRange = yRange;
        break;
      case ZoomOrientation.BOTH:
        const bothStartTimestamp = this.xScale.invert(extent[0][0]);
        const bothEndTimestamp = this.xScale.invert(extent[1][0]);
        const bothUpperY = this.yScale.invert(extent[0][1]);
        const bothBottomY = this.yScale.invert(extent[1][1]);
        xRange = [bothStartTimestamp, bothEndTimestamp];
        yRange = [bothUpperY, bothBottomY];
        this.state.xValueRange = xRange;
        this.state.yValueRange = yRange;
    }

    if(this.options.eventsCallbacks !== undefined && this.options.eventsCallbacks.zoomIn !== undefined) {
      this.options.eventsCallbacks.zoomIn([xRange, yRange]);
    } else {
      console.log('zoom in, but there is no callback');
    }
  }

  protected scrollZoomed(): void {
    this.chartContainer.selectAll('.scorecard').attr('transform', this.d3.event.transform);
  }

  protected zoomOut(): void {
    if(this.isOutOfChart() === true) {
      return;
    }
    let xAxisMiddleValue = this.xScale.invert(this.width / 2);
    if(this.options.eventsCallbacks !== undefined && this.options.eventsCallbacks.zoomOut !== undefined) {
      this.options.eventsCallbacks.zoomOut(xAxisMiddleValue as number);
    } else {
      console.log('zoom out, but there is no callback');
    }
  }

  get absXScale(): d3.ScaleLinear<number, number> {
    const domain = [0, Math.abs(this.maxValueX - this.minValueX)];
    return this.d3.scaleLinear()
      .domain(domain)
      .range([0, this.width]);
  }

  get absYScale(): d3.ScaleLinear<number, number> {
    const domain = [0, Math.abs(this.maxValue - this.minValue)];
    return this.d3.scaleLinear()
      .domain(domain)
      .range([0, this.height]);
  }

  get xScale(): d3.ScaleLinear<number, number> {
    const domain = this.state.xValueRange || [this.minValueX, this.maxValueX];
    return this.d3.scaleLinear()
      .domain(domain)
      .range([0, this.width]);
  }

  get yScale(): d3.ScaleLinear<number, number> {
    let domain = this.state.yValueRange || [this.maxValue, this.minValue];
    domain = sortBy(domain) as [number, number];
    if(this.options.axis.y.invert === true) {
      domain = reverse(domain);
    }
    return this.d3.scaleLinear()
      .domain(domain)
      .range([this.height, 0]); // inversed, because d3 y-axis goes from top to bottom
  }

  get minValue(): number {
    // y min value
    if(this.isSeriesUnavailable) {
      return DEFAULT_AXIS_RANGE[0];
    }
    if(this.options.axis.y !== undefined && this.options.axis.y.range !== undefined) {
      return min(this.options.axis.y.range)
    }
    const minValue = min(
      this.series
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
    if(this.options.axis.y !== undefined && this.options.axis.y.range !== undefined) {
      return max(this.options.axis.y.range)
    }
    const maxValue = max(
      this.series
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
    if(this.options.axis.x !== undefined && this.options.axis.x.range !== undefined) {
      return min(this.options.axis.x.range)
    }
    const minValue = min(
      this.series
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
    if(this.options.axis.x !== undefined && this.options.axis.x.range !== undefined) {
      return max(this.options.axis.x.range)
    }
    const maxValue = max(
      this.series
        .filter(serie => serie.visible !== false)
        .map(
          serie => maxBy<number[]>(serie.datapoints, dp => dp[1])[1]
        )
    );
    return maxValue;
  }

  get axisBottomWithTicks(): d3.Axis<number | Date | { valueOf(): number }> {
    // TODO: find a better way
    if(this.options.renderTicksfromTimestamps === true) {
      return this.d3.axisBottom(this.xScale)
        .tickValues(this.series[0].datapoints.map(d => new Date(d[1])));
    }
    return this.d3.axisBottom(this.xScale).ticks(this.ticksCount);
  }

  get ticksCount(): d3.TimeInterval | number {
    if(this.options.timeInterval === undefined || this.options.timeInterval.count === undefined) {
      return 5;
    }
    // TODO: add max ticks limit
    switch(this.options.axis.x.format) {
      case AxisFormat.TIME:
        return this.getd3TimeRangeEvery(this.options.timeInterval.count);;
      case AxisFormat.NUMERIC:
        // TODO: find a better way
        return this.options.timeInterval.count;
      case AxisFormat.STRING:
      // TODO: add string/symbol format
      default:
        throw new Error(`Unknown time format for x-axis: ${this.options.axis.x.format}`);
    }
  }

  getd3TimeRangeEvery(count: number): d3.TimeInterval {
    if(this.options.timeInterval === undefined || this.options.timeInterval.timeFormat === undefined) {
      return this.d3.timeMinute.every(count);
    }
    switch(this.options.timeInterval.timeFormat) {
      case TimeFormat.SECOND:
        return this.d3.utcSecond.every(count);
      case TimeFormat.MINUTE:
        return this.d3.utcMinute.every(count);
      case TimeFormat.HOUR:
        return this.d3.utcHour.every(count);
      case TimeFormat.DAY:
        return this.d3.utcDay.every(count);
      case TimeFormat.MONTH:
        return this.d3.utcMonth.every(count);
      case TimeFormat.YEAR:
        return this.d3.utcYear.every(count);
      default:
        return this.d3.utcMinute.every(count);
    }
  }

  get serieTimestampRange(): number | undefined {
    if(this.series.length === 0) {
      return undefined;
    }
    const startTimestamp = first(this.series[0].datapoints)[1];
    const endTimestamp = last(this.series[0].datapoints)[1];
    return (endTimestamp - startTimestamp) / 1000;
  }

  get xAxisTicksFormat() {
    switch(this.options.axis.x.format) {
      case AxisFormat.TIME:
        if(this.options.tickFormat !== undefined && this.options.tickFormat.xAxis !== undefined) {
          return this.d3.timeFormat(this.options.tickFormat.xAxis);
        }
        return this.d3.timeFormat('%m/%d %H:%M');
      case AxisFormat.NUMERIC:
        return (d) => d;
      case AxisFormat.STRING:
        // TODO: add string/symbol format
      default:
        throw new Error(`Unknown time format for x-axis: ${this.options.axis.x.format}`);
    }
  }

  get timeInterval(): number {
    if(this.series !== undefined && this.series.length > 0 && this.series[0].datapoints.length > 1) {
      const interval = this.series[0].datapoints[1][1] - this.series[0].datapoints[0][1];
      return interval;
    }
    if(this.options.timeInterval !== undefined && this.options.timeInterval.count !== undefined) {
      //TODO: timeFormat to timestamp
      return this.options.timeInterval.count * MILISECONDS_IN_MINUTE;
    }
    return MILISECONDS_IN_MINUTE;
  }

  get xTickTransform(): string {
    if(this.options.tickFormat === undefined || this.options.tickFormat.xTickOrientation === undefined) {
      return '';
    }
    switch (this.options.tickFormat.xTickOrientation) {
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
    if(this.options.tickFormat !== undefined && this.options.tickFormat.xTickOrientation !== undefined) {
      switch (this.options.tickFormat.xTickOrientation) {
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
    if(this.options.labelFormat !== undefined) {
      if(this.options.labelFormat.xAxis !== undefined && this.options.labelFormat.xAxis.length > 0) {
        optionalMargin.bottom += 20;
      }
      if(this.options.labelFormat.yAxis !== undefined && this.options.labelFormat.yAxis.length > 0) {
        optionalMargin.left += 20;
      }
    }
    if(this.series.length > 0) {
      optionalMargin.bottom += 25;
    }
    return optionalMargin;
  }

  get width(): number {
    return this.d3Node.node().clientWidth - this.margin.left - this.margin.right;
  }

  get height(): number {
    return this.d3Node.node().clientHeight - this.margin.top - this.margin.bottom;
  }

  get legendRowPositionY(): number {
    return this.height + this.margin.bottom - 5;
  }

  get margin(): Margin {
    if(this.options.margin !== undefined) {
      return this.options.margin;
    }
    return mergeWith({}, DEFAULT_MARGIN, this.extraMargin, add);
  }

  get isSeriesUnavailable(): boolean {
    // TODO: Use one && throw error
    return this.series === undefined || this.series.length === 0 || this.series[0].datapoints.length === 0;
  }

  formatedBound(alias: string, target: string): string {
    const confidenceMetric = replace(alias, '$__metric_name', target);
    return confidenceMetric;
  }

  protected getSerieColor(idx: number): string {
    if(this.series[idx] === undefined) {
      throw new Error(
        `Can't get color for unexisting serie: ${idx}, there are only ${this.series.length} series`
      );
    }
    let serieColor = this.series[idx].color;
    if(serieColor === undefined) {
      serieColor = palette[idx % palette.length];
    }
    return serieColor;
  }

  protected get seriesTargetsWithBounds(): any[] {
    if(
      this.options.bounds === undefined ||
      this.options.bounds.upper === undefined ||
      this.options.bounds.lower === undefined
    ) {
      return [];
    }
    let series = [];
    this.series.forEach(serie => {
      series.push(this.formatedBound(this.options.bounds.upper, serie.target));
      series.push(this.formatedBound(this.options.bounds.lower, serie.target));
    });
    return series;
  }

  protected get visibleSeries(): any[] {
    return this.series.filter(serie => serie.visible !== false);
  }

  protected get rectClipId(): string {
    if(this._clipPathUID.length === 0) {
      this._clipPathUID = uid();
    }
    return this._clipPathUID;
  }

  isOutOfChart(): boolean {
    const event = this.d3.mouse(this.chartContainer.node());
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
  ChartwerkPod, VueChartwerkPodMixin,
  Margin, TimeSerie, Options, TickOrientation, TimeFormat, ZoomOrientation, ZoomType, AxisFormat,
  palette
};
