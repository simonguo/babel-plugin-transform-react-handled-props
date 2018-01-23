import _ from 'lodash'
import {
  getClassDeclaration,
  getEntryIdentifier,
  getExpressionIdentifier,
  isArrayValue,
  isObjectProperty,
  isObjectValue,
  isStaticProperty,
  isValidExpression,
  isValidProperty,
} from '../util'

const getArrayItems = ({ elements }) => _.map(elements, ({ value }) => value)

const getObjectKeys = ({ properties }) => {
  const objectProperties = _.filter(properties, isObjectProperty)

  return _.map(objectProperties, ({ key: { name } = {} }) => name)
}

const getFlowTypeKeys = path => {
  const globals = Object.keys(_.get(path, 'scope.globals')) || []
  return _.filter(globals, key => key !== 'Node')
}

const getTypeAliasIdentifier = path => {
  const entries = _.get(path, 'state.entries')
  if (!entries) {
    return
  }
  return _.get(Object.keys(entries), '0')
}

const propVisitor = {
  TypeAlias(path, state) {
    const identifier = getTypeAliasIdentifier(path)
    if (identifier) {
      state.addProps(identifier, getFlowTypeKeys(path))
    }
  },
  AssignmentExpression(path, state) {
    const identifier = getExpressionIdentifier(path)
    const right = _.get(path, 'node.right')

    if (!state.hasEntry(identifier)) return
    if (isValidExpression(path, ['handledProps']) && isArrayValue(right)) {
      state.addProps(identifier, getArrayItems(right))
      path.remove()

      return
    }

    if (isValidExpression(path, ['defaultProps', 'propTypes']) && isObjectValue(right)) {
      state.addProps(identifier, getObjectKeys(right))
    }
  },
  ClassProperty(path, state) {
    const expression = getClassDeclaration(path)
    const identifier = getEntryIdentifier(expression)
    const value = _.get(path, 'node.value')

    if (!state.hasEntry(identifier) || !isStaticProperty(path)) return

    if (isValidProperty(path, ['handledProps']) && isArrayValue(value)) {
      state.addProps(identifier, getArrayItems(value))
      path.remove()

      return
    }

    if (isValidProperty(path, ['defaultProps', 'propTypes']) && isObjectValue(value)) {
      state.addProps(identifier, getObjectKeys(value))
    }
  },
}

export default propVisitor
