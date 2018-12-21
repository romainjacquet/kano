import math from 'mathjs'

// TODO the following was taken from Weacast's legend mixin, however maybe we should get this from a config file?
// Add knot unit not defined by default
math.createUnit('knot', { definition: '0.514444 m/s', aliases: ['knots', 'kt', 'kts'] })

const COLOR_STEPS = 10

let legendMixin = {
  data () {
    return {
      colorLayer: null,
      // These are the properties for the KColorLegend component, which are calculated from the 'active' layer.
      // If there are no visible/active layers then we set "visible" to false to completely hide the color legend.
      colorLegend: {
        visible: false,
        unit: null,
        hint: null,
        colorMap: null,
        values: null,
        showGradient: false
      }
    }
  },  
  methods: {
    onColorLegendShowLayer (event) {
      const leafletLayer = event.leafletLayer

      let colorLayer = {
        layer: event.layer,
        leafletLayer
      }

      // Callback to be triggered once the data for the leafletLayer has been loaded, the color legend can then be shown
      colorLayer.callback = () => this.addColorLegend(colorLayer)

      // We need to wait until data is here because it is require to get color map
      if (leafletLayer.hasData) this.addColorLegend(colorLayer)
      else leafletLayer.on('data', colorLayer.callback)
    },
    onColorLegendHideLayer (event) {
      if (this.colorLayer && this.colorLayer.leafletLayer._leaflet_id == event.leafletLayer._leaflet_id) {
        this.hideColorLegend()
      }
    },
    addColorLegend (layer) {
      const leafletLayer = layer.leafletLayer
      leafletLayer.off('data', layer.callback)

      if (leafletLayer.colorMap) {
        this.updateColorLegend(layer)
      }
    },
    hideColorLegend () {
      this.updateColorLegend(null)
    },
    resetColorLegend () {
      this.colorLegend.visible = false
      this.colorLegend.unit = null
      this.colorLegend.hint = null
      this.colorLegend.colorMap = null
      this.colorLegend.values = null
      this.colorLegend.showGradient = false
    },
    updateColorLegend (colorLayer) {
      this.colorLayer = colorLayer

      // Reset & hide the color legend
      if (!this.colorLayer) {
        this.resetColorLegend()

      } else {
        const leafletLayer = colorLayer.leafletLayer
        const colorMap = leafletLayer.colorMap     

        const units = this.getColorLegendUnits(colorLayer)  //const units = ['m/s', 'knot']   // TODO only for testing

        const unit = !units || units.length === 0 ? null : units[0]
        const hint = this.getColorLegendHint(units, unit, colorLayer.layer.name)
        const [ showGradient, values ] = this.getColorLegendValues(colorMap, units, unit, COLOR_STEPS)

        // We don't have units or steps for this layer, hide it
        if (unit === null || values.length === 0) {
          this.hideColorLegend()

        // Units and steps (re)calculated, update the color legend
        } else {
          this.colorLegend.unit = unit
          this.colorLegend.hint = hint
          this.colorLegend.colorMap = colorMap
          this.colorLegend.values = values
          this.colorLegend.showGradient = showGradient
    
          this.colorLegend.visible = true
        }
      }
    },
    // Color legend was clicked - toggle to the next unit
    onColorLegendClick (event) {
      const colorLayer = this.colorLayer
      const leafletLayer = colorLayer.leafletLayer
      const colorMap = leafletLayer.colorMap     

      const units = this.getColorLegendUnits(colorLayer)  //const units = ['m/s', 'knot']   // TODO only for testing

      // There's only one unit, no toggling to do, we're done
      if (units.length <= 1) {
        return
      }

      // Get next unit and recalculate hint and steps
      const nextUnit = this.getNextUnit(units, event.unit)
      const hint = this.getColorLegendHint(units, nextUnit, colorLayer.layer.name)
      const [ showGradient, values ] = this.getColorLegendValues(colorMap, units, nextUnit, COLOR_STEPS)
      
      // Units and steps (re)calculated, update the color legend
      this.colorLegend.unit = nextUnit
      this.colorLegend.hint = hint
      this.colorLegend.colorMap = colorMap
      this.colorLegend.values = values
      this.colorLegend.showGradient = showGradient
    },
    getColorLegendUnits(colorLayer) {
      return colorLayer.layer.variables[0].units
    },
    getColorLegendHint (units, unit, layerName) {
      if (!units || units.length <= 1 || !unit) {
        return null
      }

      // Determine hint by calling "this.getNextUnit"
      const nextUnit = this.getNextUnit(units, unit)

      return this.$t('ColorLegend.CONVERT_UNITS', {layer: layerName, unit: nextUnit})
    },
    getColorLegendValues (colorMap, units, unit, steps) {
      if (!colorMap || !units || units.length === 0 || !unit) return []

      let showGradient
      let values

      const unitFrom = units[0]   // base unit
      const unitTo = unit

      function valueMap (value) {
        return math.unit(value, unitFrom).toNumber(unitTo).toFixed(0)
      }

      const classes = colorMap.classes()

      if (classes) {
        values = classes
        showGradient = false

        return [ showGradient, values.map(valueMap) ]
      }

      values = []

      const dm = colorMap.domain()[0]
      const dd = colorMap.domain()[1] - dm
      
      for (let i = 0; i < steps; i++) {
        const value = dm + i / (steps-1) * dd
        values.push(value)
      }

      showGradient = true
      return [ showGradient, values.map(valueMap) ]
    },
    getNextUnit(units, currentUnit) {
      // No available units
      if (!units || units.length <= 1 || !currentUnit) return null

      // 'Rotate' from the current unit to the next
      const index = units.findIndex(unit => unit === currentUnit)
      const newIndex = index === -1 ? null : index === units.length-1 ? 0 : index+1 
      const unit = newIndex === null ? null : units[newIndex]

      return unit
    },
  },
  mounted () {
    this.colorLayer = null
    this.resetColorLegend()

    // Connect the events fired by mixin.base-map
    this.$on('leaflet-layer-added', this.onColorLegendShowLayer)
    this.$on('leaflet-layer-shown', this.onColorLegendShowLayer)
    this.$on('leaflet-layer-hidden', this.onColorLegendHideLayer)
    // TODO necessary? we just ignore this and set this.colorLayer to null in "beforeDestroy"
    // this.$on('map-remove-leaflet-layer', this.onColorLegendRemoveLayer)
  },
  beforeDestroy () {
    // Delete reference to the colorLayer
    this.colorLayer = null
    this.resetColorLegend()

    // Disconnect the events
    this.$off('leaflet-layer-added', this.onColorLegendShowLayer)
    this.$off('leaflet-layer-shown', this.onColorLegendShowLayer)
    this.$off('leaflet-layer-hidden', this.onColorLegendHideLayer)
    // this.$off('map-remove-leaflet-layer', this.onColorLegendRemoveLayer)
  }  
}

export default legendMixin
