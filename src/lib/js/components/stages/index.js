import ComponentData from '../component-data.js'
import Stage from './stage.js'

const DEFAULT_CONFIG = () => ({
  actionButtons: {
    buttons: ['edit'],
    disabled: [],
  },
  panels: {
    disabled:[],
    // The 'order' array specifies the sequence in which the panels should be displayed.
    // Each string in the array represents a panel type, such as 'attrs', 'options', or 'conditions'.
    // By default, these panels are ordered as you see below, but can be override via formeo options.
    order: ['attrs', 'options', 'conditions'],
  },
})

export class Stages extends ComponentData {
  constructor(stageData) {
    super('stages', stageData)
    this.config = { all: DEFAULT_CONFIG() }
  }
  Component(data) {
    return new Stage(data)
  }
}

const stages = new Stages()

export default stages
