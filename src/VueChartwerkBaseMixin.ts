import * as _ from 'lodash';

export default {
  name: 'ChartwerkBase',
  props: {
    id: {
      type: String,
      required: true
    },
    series: {
      type: Array,
      required: false,
      default: function () { return []; }
    },
    options: {
      type: Object,
      required: false,
      default: function () { return {}; }
    }
  },
  watch: {
    id() {
      this.renderChart();
    },
    series() {
      this.renderChart();
    },
    options() {
      this.renderChart();
    }
  },
  mounted() {
    this.renderChart();
  },
  methods: {
    // it's "abstract" method. "children" components should override it
    render() { },
    renderChart() {
      this.appendEvents();
      this.render();
    },
    appendEvents() {
      if(this.options.eventsCallbacks === undefined) {
        this.options.eventsCallbacks = {}
      }
      if(_.has(this.$listeners, 'zoomIn')) {
        this.options.eventsCallbacks.zoomIn = this.zoomIn.bind(this);
      }
      if(_.has(this.$listeners, 'zoomOut')) {
        this.options.eventsCallbacks.zoomOut = this.zoomOut.bind(this);
      }
      if(_.has(this.$listeners, 'mouseMove')) {
        this.options.eventsCallbacks.mouseMove = this.mouseMove.bind(this);
      }
      if(_.has(this.$listeners, 'mouseOut')) {
        this.options.eventsCallbacks.mouseOut = this.mouseOut.bind(this);
      }
      if(_.has(this.$listeners, 'onLegendClick')) {
        this.options.eventsCallbacks.onLegendClick = this.onLegendClick.bind(this);
      }
    },
    zoomIn(range) {
      this.$emit('zoomIn', range);
    },
    zoomOut(center) {
      this.$emit('zoomOut', center);
    },
    mouseMove(evt) {
      this.$emit('mouseMove', evt);
    },
    mouseOut() {
      this.$emit('mouseOut');
    },
    onLegendClick(idx) {
      this.$emit('onLegendClick', idx);
    }
  }
};
