function isMetricTag(node) {
  return node?.type === "JSXIdentifier" && node.name === "Metric";
}

function insideMetricPrimitive(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (
      current.type === "JSXElement" &&
      isMetricTag(current.openingElement.name)
    ) {
      return true;
    }
    if (
      (current.type === "FunctionDeclaration" ||
        current.type === "FunctionExpression" ||
        current.type === "ArrowFunctionExpression") &&
      current.id?.name === "Metric"
    ) {
      return true;
    }
  }
  return false;
}

const noUnprovenancedFormat = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Flag direct numeric formatting in JSX outside the shared Metric primitive",
    },
    schema: [],
    messages: {
      unprovenanced:
        "Numeric formatting in JSX needs <Metric> provenance or an explicit census exemption.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== "MemberExpression" ||
          node.callee.computed ||
          !["toFixed", "toLocaleString"].includes(node.callee.property.name) ||
          node.parent.type !== "JSXExpressionContainer" ||
          insideMetricPrimitive(node)
        ) {
          return;
        }
        context.report({ node, messageId: "unprovenanced" });
      },
    };
  },
};

export default noUnprovenancedFormat;
