<template>
  <div class="vue-chartwerk-base" :id="id">
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
      required: true
    },
    options: {
      type: Object,
      required: true
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
    renderBase() {
      this.appendEvents();
      //@ts-ignore
      new ChartwerkBase(document.getElementById(this.id), this.series, this.options);
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
.vue-chartwerk-base {
  width: 100%;
  height: 100%;
}
</style>
