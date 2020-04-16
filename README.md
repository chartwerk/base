# Chartwerk Base

Plugin with an abstract class providing basics for timeseries visualization.

## Plugin renders:
- SVG container with:
  - Axes with ticks and labels
  - Grid, scales using specified time interval
  - Legend which can hide metrics

## Options:

All options are optional

- `margin` — chart container positioning;
```js
margin={
  top: number,
  right: number,
  bottom: number,
  left: number
}
```

- `colors`: array of metrics colors, should be equal or greater than series length;
```js
['red', 'blue', 'green']
```

- `timeInterval`: interval in minutes (max value = 60) affecting grid and x-axis ticks

- `tickFormat`: config to control the axes ticks format
```js
{
  xAxis: string; // x-axis time format (see [d3-time-format](https://github.com/d3/d3-time-format#locale_format) } 
  xTickOrientation: TickOrientation; // horizontal, diagonal or vertical orientation
}
```
for example:
```js
{
  xAxis: '%Y-%m-%d %H:%M',
  xTickOrientation: TickOrientation.DIAGONAL
}
```

- `labelFormat`: labels for axes
```
{
  xAxis: string;
  yAxis: string;
}
```
for example:
```js
{
  xAxis: 'Time';
  yAxis: 'Value';
}
```

- `eventsCallbacks`: event callbacks

```js
{
  zoomIn: (range: [number, number]) => void,
  zoomOut: (center: number) => void,
  mouseMove: (evt: any) => void,
  mouseOut: () => void,
  onLegendClick: (idx: number) => void
}
```
