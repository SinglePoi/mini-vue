export function shouldUpdateComponet(prevVnode, nextVNode) {
  const { props: prevProps } = prevVnode;
  const { props: nextProps } = nextVNode;

  for (const key in nextProps) {
    if (nextProps[key] !== prevProps[key]) {
      return true;
    }
    return false;
  }
}
