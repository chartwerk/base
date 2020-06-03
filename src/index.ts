import VueChartwerkBaseMixin from './VueChartwerkBaseMixin';

import styles from './css/style.css';

import { Margin, TimeSerie, Options, TickOrientation, TimeFormat } from './types';
import { getRandomColor } from './utils';

// we import only d3 types here
import * as d3 from 'd3';
import * as _ from 'lodash';


const DEFAULT_MARGIN: Margin = { top: 30, right: 20, bottom: 20, left: 30 };
const DEFAULT_TICK_COUNT = 4;
const MAX_GRID_COUNT = 24;
const SECONDS_IN_DAY = 24 * 60 * 60;
const MILISECONDS_IN_MINUTE = 60 * 1000;
const DEFAULT_OPTIONS: Options = {
  timeInterval: {
    timeFormat: TimeFormat.MINUTE
  },
  tickFormat: {
    xAxis: '%m/%d %H:%M',
    xTickOrientation: TickOrientation.HORIZONTAL
  },
  renderBarLabels: true,
  renderTicksfromTimestamps: false,
  renderBrushing: true,
  renderYaxis: true,
  renderXaxis: true,
  renderLegend: true,
  renderCrosshair: true
}

abstract class ChartwerkBase {
  protected _d3Node?: d3.Selection<HTMLElement, unknown, null, undefined>;
  protected _chartContainer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected _crosshair?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected _brush?: d3.BrushBehavior<unknown>;

  constructor(
    // maybe it's not the best idea
    protected _d3: typeof d3,
    el: HTMLElement,
    protected _series: TimeSerie[] = [],
    protected _options: Options = {}
  ) {
    // TODO: test if it's necessary
    styles.use();

    _.defaults(this._options, DEFAULT_OPTIONS);
    if(this._options.colors === undefined) {
      this._options.colors = this._series.map(getRandomColor);
    }
    if(this._options.confidence === undefined) {
      this._options.confidence = 0;
    }

    const colorsCount = this._options.colors.length;
    const seriesCount = this._series.length;
    if(colorsCount < seriesCount) {
      throw new Error(`
        Colors count should be greater or equal than series count.
        Current: colors count (${colorsCount}) < series count (${seriesCount})
      `);
    }
    this._d3Node = this._d3.select(el);

    this.render();
  }

  render(): void {
    console.log('base upd 1')
    this._renderSvg();
    this._renderXAxis();
    this._renderYAxis();
    this._renderGrid();

    this._renderMetrics();
    this._renderCrosshair();
    this._useBrush();

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

  _renderSvg(): void {
    this._d3Node.select('svg').remove();
    this._chartContainer = this._d3Node
      .append('svg')
        .style('width', '100%')
        .style('height', '100%')
        .append('g')
          .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // TODO: clipPath
  }

  _renderGrid(): void {
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
  }

  _renderXAxis(): void {
    if(this._options.renderXaxis === false) {
      return;
    }
    this._chartContainer
      .append('g')
      .attr('transform', `translate(0,${this.height})`)
      .attr('id', 'x-axis-container')
      .call(
        this.axisBottomWithTicks
          .tickSize(2)
          .tickFormat(this.timeFormat)
      );
    this._chartContainer.select('#x-axis-container').selectAll('.tick').selectAll('text')
      .style('transform', this.xTickTransform);
  }

  _renderYAxis(): void {
    if(this._options.renderYaxis === false) {
      return;
    }
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

    this._crosshair.append('line')
      .attr('class', 'crosshair-line')
      .attr('id', 'crosshair-line-x')
      .attr('fill', 'red')
      .attr('stroke', 'red')
      .attr('stroke-width', '1px')
      .attr('y1', 0)
      .attr('y2', this.height);

    for(let i = 0; i < this._series.length; i++) {
      this._crosshair.append('circle')
        .attr('class', 'crosshair-circle')
        .attr('id', `crosshair-circle-${i}`)
        .attr('r', 2)
        .style('fill', 'none')
        .style('stroke', 'red')
        .style('stroke-width', '1px')
        .style('display', 'none');
    }

    this._chartContainer.append('rect')
      .style('fill', 'none')
      .style('stroke', 'none')
      .style('pointer-events', 'all')
      .style('cursor', 'crosshair')
      .attr('width', this.width)
      .attr('height', this.height);
  }

  _useBrush(): void {
    if(this._options.renderBrushing === false) {
      return;
    }
    this._brush = this._d3.brushX()
      .extent([
        [0, 0],
        [this.width, this.height]
      ])
      .handleSize(20)
      .filter(() => !this._d3.event.shiftKey)
      .on('start', this.onBrushStart.bind(this))
      .on('end', this.onBrushEnd.bind(this))

    this._chartContainer
      .call(this._brush)
      .on('mouseover', this.onMouseOver.bind(this))
      .on('mouseout', this.onMouseOut.bind(this))
      .on('mousemove', this.onMouseMove.bind(this))
      .on('dblclick', this.zoomOut.bind(this));
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
        if(_.includes(this.seriesTargetsWithBounds, this._series[idx].target)) {
          continue;
        }
        let node = legendRow.selectAll('text').node();
        let rowWidth = 0;
        if(node !== null) {
          // @ts-ignore
          rowWidth = legendRow.node().getBBox().width + 25;
        }

        const isChecked = this._series[idx].visible !== false;
        legendRow.append('foreignObject')
          .attr('x', rowWidth)
          .attr('y', this.legendRowPositionY - 12)
          .attr('width', 13)
          .attr('height', 13)
          .html(`<form><input type=checkbox ${isChecked? 'checked' : ''} /></form>`)
          .on('click', () => {
            this._options.eventsCallbacks.onLegendClick(idx);
          });

        legendRow.append('text')
          .attr('x', rowWidth + 20)
          .attr('y', this.legendRowPositionY)
          .attr('class', `metric-legend-${idx}`)
          .style('font-size', '12px')
          .style('fill', this._options.colors[idx])
          // @ts-ignore
          .text(this._series[idx].target);
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
    let yPosition = this.height + this.margin.top + this.margin.bottom - 45;
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

  onBrushStart(): void {
    if(this._options.eventsCallbacks !== undefined && this._options.eventsCallbacks.mouseOut() !== undefined) {
      this._options.eventsCallbacks.mouseOut();
    } else {
      console.log('mouse out, but there is no callback');
    }
  }

  onBrushEnd(): void {
    const extent = this._d3.event.selection;
    if(extent === undefined || extent === null || extent.length < 2) {
      return;
    }
    this._chartContainer
      .call(this._brush.move, null);
    const startTimestamp = this.xScale.invert(extent[0]).getTime();
    const endTimestamp = this.xScale.invert(extent[1]).getTime();
    if(Math.abs(endTimestamp - startTimestamp) < this.timeInterval) {
      return;
    }
    const range: [number, number] = [startTimestamp, endTimestamp];
    if(this._options.eventsCallbacks !== undefined && this._options.eventsCallbacks.zoomIn !== undefined) {
      this._options.eventsCallbacks.zoomIn(range);
    } else {
      console.log('zoom in, but there is no callback');
    }
  }

  zoomOut(): void {
    if(this.isOutOfChart() === true) {
      return;
    }
    const midTimestamp = this.xScale.invert(this.width / 2).getTime();
    if(this._options.eventsCallbacks !== undefined && this._options.eventsCallbacks.zoomOut !== undefined) {
      this._options.eventsCallbacks.zoomOut(midTimestamp);
    } else {
      console.log('zoom out, but there is no callback');
    }
  }

  get xScale(): d3.ScaleTime<number, number> {
    if((this._series === undefined || this._series.length === 0 || this._series[0].datapoints.length === 0) &&
      this._options.timeRange !== undefined) {
      return this._d3.scaleTime()
        .domain([
          new Date(this._options.timeRange.from),
          new Date(this._options.timeRange.to)
        ])
        .range([0, this.width]);
    }
    // TODO: add timezone (utc / browser) to options and use it
    return this._d3.scaleTime()
      .domain([
        new Date(_.first(this._series[0].datapoints)[1]),
        new Date(_.last(this._series[0].datapoints)[1])
      ])
      .range([0, this.width]);
  }

  get timestampScale(): d3.ScaleLinear<number, number> {
    return this._d3.scaleLinear()
      .domain([
        _.first(this._series[0].datapoints)[1],
        _.last(this._series[0].datapoints)[1]
      ])
      .range([0, this.width])
  }

  get yScale(): d3.ScaleLinear<number, number> {
    if(
      this.minValue === undefined ||
      this.maxValue === undefined
    ) {
      return this._d3.scaleLinear()
        // TODO: why [100, 0]?
        .domain([100, 0])
        .range([0, this.height]);
    }

    return this._d3.scaleLinear()
      .domain([this.maxValue, this.minValue])
      .range([0, this.height]);
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
    console.log('ticks', this._options.timeInterval, this._options.timeInterval.count);
    if(this._options.timeInterval !== undefined && this._options.timeInterval.count !== undefined) {
      // TODO: refactor max ticks limit
      // if(this.daysCount > 1 * scaleFactor) {
      //   return MAX_GRID_COUNT * scaleFactor;
      // } else {}
      return this.getd3TimeRangeEvery(this._options.timeInterval.count);
    }
    return 5;
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

  get daysCount(): number {
    const timestampRange = this.serieTimestampRange;
    if(timestampRange === undefined) {
      return 0;
    }
    return timestampRange / SECONDS_IN_DAY;
  }

  get serieTimestampRange(): number | undefined {
    if(this._series.length === 0) {
      return undefined;
    }
    const startTimestamp = _.first(this._series[0].datapoints)[1];
    const endTimestamp = _.last(this._series[0].datapoints)[1];
    return (endTimestamp - startTimestamp) / 1000;
  }

  get timeFormat(): (date: Date) => string {
    if(this._options.tickFormat !== undefined && this._options.tickFormat.xAxis !== undefined) {
      return this._d3.timeFormat(this._options.tickFormat.xAxis);
    }
    return this._d3.timeFormat('%m/%d %H:%M');
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
    return _.mergeWith({}, DEFAULT_MARGIN, this.extraMargin, _.add);
  }

  get minValue(): number | undefined {
    const minValue = _.min(
      this._series
        .filter(serie => serie.visible !== false)
        .map(
          serie => _.minBy<number[]>(serie.datapoints, dp => dp[0])[0]
        )
    );

    if(minValue === undefined) {
      return undefined;
    }
    return minValue - this._options.confidence;
  }

  get maxValue(): number | undefined {
    const maxValue = _.max(
      this._series
        .filter(serie => serie.visible !== false)
        .map(
          serie => _.maxBy<number[]>(serie.datapoints, dp => dp[0])[0]
        )
    );

    if(maxValue === undefined) {
      return undefined;
    }
    return maxValue + this._options.confidence;
  }

  formatedBound(alias: string, target: string): string {
    const confidenceMetric = _.replace(alias, '$__metric_name', target);
    return confidenceMetric;
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

export { ChartwerkBase, VueChartwerkBaseMixin };
