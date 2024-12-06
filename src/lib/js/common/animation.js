const animate = {
  /**
   * Get the computed style for DOM element
   * @param  {Object}  elem     dom element
   * @param  {Boolean} property style eg. width, height, opacity
   * @return {String}           computed style
   */
  getStyle: (elem, property = false) => {
    let style
    if (window.getComputedStyle) {
      style = window.getComputedStyle(elem, null)
    } else if (elem.currentStyle) {
      style = elem.currentStyle
    }

    return property ? style[property] : style
  },

  fadeOut: (elem, duration = 250) => {
    const increment = 1 / (duration / 60)
    elem.style.opacity = 1
    ;(function fade() {
      const val = Number(elem.style.opacity) - increment
      if (val > 0) {
        elem.style.opacity = val
        window.requestAnimationFrame(fade)
      } else {
        elem.remove()
      }
    })()
  },

  slideDown: (elem, duration = 250, cb = false) => {
    elem.style.display = 'block'
    const style = animate.getStyle(elem)
    const height = Number.parseInt(style.height, 10)
    const increment = height / (duration / 60)
    elem.style.height = '0px'
    ;(function slideDown() {
      const curHeight = Number.parseFloat(elem.style.height)
      const val = curHeight + increment
      if (curHeight < height) {
        elem.style.height = val + 'px'
        window.requestAnimationFrame(slideDown)
      } else {
        // reset height to be used by slideUp
        // elem.style.height = height + 'px';
        elem.style.height = 'auto'
        if (cb) {
          cb(elem)
        }
      }
    })()
  },

  slideUp: (elem, duration = 250, cb = false) => {
    const style = animate.getStyle(elem)
    const height = Number.parseInt(style.height)
    const overFlowBack = style.overflow
    elem.style.overflow = 'hidden'
    elem.style.height = `${height}px`
    const defMinHeight = style.minHeight
    elem.style.minHeight = 'auto'
    const increment = parseFloat(height / (duration / 60)).toFixed(2)
    ;(function slideUp() {
      const curHeight = Number.parseInt(elem.style.height, 10)
      const val = curHeight - increment
      if (val > 0) {
        elem.style.height = val + 'px'
        window.requestAnimationFrame(slideUp)
      } else {
        elem.style.overflow = overFlowBack
        elem.style.display = 'none'
        elem.style.minHeight = defMinHeight
        delete elem.style.height
        if (cb) {
          cb(elem)
        }
      }
    })()
  },

  slideToggle: (elem, duration = 250, open = animate.getStyle(elem, 'display') === 'none') => {
    if (open) {
      animate.slideDown(elem, duration)
    } else {
      animate.slideUp(elem, duration)
    }
  },
}

export default animate
