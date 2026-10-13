export function resolveDeckProps(props = {}) {
  return {
    addable: props.addable ?? true,
    unmountable: props.unmountable ?? true,
  }
}
