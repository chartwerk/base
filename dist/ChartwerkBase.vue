<template>
  <div class="chartwerk-base" :id="id">
  </div>
</template>

<script>
import { ChartwerkBase } from '@chartwerk/base';

import Vue from 'vue';

import * as _ from 'lodash';

export default {
  name: 'ChartwerkBase',
  props: {
    id: {
      type: String,
      required: true
    },
    series: {
      type: [Object],
      required: false,
      default: []
    },
    options: {
      type: Object,
      required: false,
      default: {}
    }
  },
  watch: {
    id() {
      this.renderBase();
    },
    series() {
      this.renderBase();
    },
    options() {
      this.renderBase();
    }
  },
  methods: {
    // it's abstract method. "children" components should override it
    render() {
      // it's just example
      new ChartwerkBase(document.getElementById(this.id), this.series, this.options);
    }
    renderBase() {
      this.appendEvents();
      this.render();
    },
    appendEvents() {
      if(_.has(this.$listeners, 'zoomIn')) {
        this.options.eventsCallbacks.zoomIn = this.zoomIn;
      }
      if(_.has(this.$listeners, 'zoomOut')) {
        this.options.eventsCallbacks.zoomOut = this.zoomOut;
      }
      if(_.has(this.$listeners, 'mouseMove')) {
        this.options.eventsCallbacks.mouseMove = this.mouseMove;
      }
      if(_.has(this.$listeners, 'mouseOut')) {
        this.options.eventsCallbacks.mouseOut = this.mouseOut;
      }
      if(_.has(this.$listeners, 'onLegendClick')) {
        this.options.eventsCallbacks.onLegendClick = this.onLegendClick;
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
}
</script>

<style scoped>
.chartwerk-base {
  width: 100%;
  height: 100%;
}
</style>
