# DEPRECATED, goto https://github.com/chartwerk/core


# Chartwerk Pod

Plugin with an abstract class providing basics for visualization.

## Plugin renders:
- SVG container with:
  - Axes, with ticks and labels.
  - Grid, which scales using specified time interval.
  - Legend, which can hide metrics.

## Options:

Options are not mandatory:

- `margin` — chart container positioning;
```js
margin={
  top: number,
  right: number,
  bottom: number,
  left: number
}
```

- `colors`: array of metrics colors (should be equal or greater than series length);
```js
['red', 'blue', 'green']
```

- `timeInterval`: interval in minutes (max value = 60) affecting grid and x-axis ticks.

- `tickFormat`: config to control the axes ticks format.
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

- `labelFormat`: labels for axes.
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

- `bounds`: specify which metrics should be rendered as confidence. (TODO: move to `@chartwerk/line-chart`)
`$__metric_name` macro can be used here. It will be replaced with each metric's name to find it's bound.
```
{
  upper: string;
  lower: string;
}
```

for example:
metric names: 'serie', 'serie upper_bound', 'serie lower_bound'
```js
bounds={
  upper: '$__metric_name upper_bound';
  lower: '$__metric_name lower_bound';
}
```
'serie upper_bound', 'serie lower_bound' metrics will be rendered as `serie` metric confidence;

- `timeRange`: time range in timestamps
```
{
  from: number;
  to: number;
}
```
for example:
```js
{
  from: 1582770000000;
  to: 1582810000000;
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
