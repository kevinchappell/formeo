import startCase from 'lodash/startCase'

import aceEditor, { config } from 'ace-builds/src-noconflict/ace'
import Json from 'ace-builds/src-noconflict/mode-json?url'
import githubTheme from 'ace-builds/src-noconflict/theme-github_light_default?url'

config.setModuleUrl('ace/mode/json', Json)
config.setModuleUrl('ace/theme/github_light_default', githubTheme)
const jsonEditor = aceEditor.edit('formData-editor')
jsonEditor.session.setOption('useWorker', false)

jsonEditor.setOptions({
  theme: 'ace/theme/github_light_default',
  mode: 'ace/mode/json',
})

const submitFormData = document.getElementById('submit-formData')
const popover = document.getElementById('formData-popover')

const editorActionButtonContainer = document.getElementById('editor-action-buttons')
const renderFormWrap = document.querySelector('.render-form')
const editorActions = (editor, renderer) => {
  return {
    renderForm: () => {
      renderFormWrap.style.display = 'block'
      renderer.render(editor.formData)
    },
    // logJSON: () => console.log(JSON.stringify(JSON.parse(editor.json), null, 2)),
    // viewData: () => {
    //   for (const [key, val] of Object.entries(editor.formData)) {
    //     console.log(key, val)
    //   }
    // },
    getHtml: () => {
      renderer.formData = editor.formData
      const html = renderer.html
      const win = window.open('', '_blank')
      win.document.body.innerHTML = html
    },
    getUserData: () => {
      // renderer.getRenderedForm(editor.formData)
      console.log(renderer.userData)
    },
    resetEditor: () => {
      window.sessionStorage.removeItem('formeo-formData')
      window.location.reload()
    },
    editData: () => {
      jsonEditor.setValue(JSON.stringify(editor.formData, null, 2), 1)
    },
  }
}

const buttonIdAttrsMap = {
  editData: { popovertarget: 'formData-popover' },
}
const getButtonAttrs = id => {
  const attrs = buttonIdAttrsMap[id] || {}
  return { id, type: 'button', ...attrs }
}

export const editorButtons = (editor, renderer) => {
  submitFormData.addEventListener('click', () => {
    editor.formData = jsonEditor.session.getValue()
    popover.hidePopover()
  })

  const buttonActions = editorActions(editor, renderer)
  const buttons = Object.entries(buttonActions).map(([id, cb]) => {
    const attrs = getButtonAttrs(id)
    const button = Object.assign(document.createElement('button'), attrs)
    for (const [key, value] of Object.entries(attrs)) {
      button.setAttribute(key, value)
    }
    const buttonText = document.createTextNode(startCase(id))
    button.appendChild(buttonText)
    button.addEventListener('click', cb, false)
    editorActionButtonContainer.appendChild(button)
    return button
  })

  return buttons
}

document.getElementById('format-json').addEventListener('click', formatJSON)
document.getElementById('collapse-json').addEventListener('click', collapseJSON)
document.getElementById('copy-json').addEventListener('click', copyJSON)

function formatJSON() {
  const val = jsonEditor.session.getValue()
  const o = JSON.parse(val)
  jsonEditor.setValue(JSON.stringify(o, null, 2), 1)
}

function collapseJSON() {
  const val = jsonEditor.session.getValue()
  const o = JSON.parse(val)
  jsonEditor.setValue(JSON.stringify(o, null, 0), 1)
}

async function copyJSON({ target }) {
  const textBackup = target.textContent
  target.textContent = 'Copied!'
  const timeout = setTimeout(() => {
    target.textContent = textBackup
    clearTimeout(timeout)
  }, 3000)

  try {
    await navigator.clipboard.writeText(jsonEditor.session.getValue())
    console.log('Text copied to clipboard')
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}
