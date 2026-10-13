import presentedSurface from './presentedSurface.js'

const defaultMinimumSize = Object.freeze({ width: 240, height: 180 })

export function minimumPresentationSize({ engine, surface }) {
  const presented = presentedSurface({ engine, surface })
  const definition = engine?.runtime.resolveApplicationNode(presented?.application)?.Applet
  return definition?.meta?.minimumSize ?? defaultMinimumSize
}

export function constrainPresentationSize(size, minimumSize = defaultMinimumSize) {
  if (!size) return null
  const width = Math.max(size.width, minimumSize.width)
  const height = Math.max(size.height, minimumSize.height)
  return width === size.width && height === size.height ? size : { width, height }
}
