import ComponentData from '../component-data.js'
import Stage from './stage.js'

const DEFAULT_CONFIG = () => ({
  actionButtons: {
    buttons: ['edit'],
    disabled: [],
  },
  panels: {
    disabled:[],
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
