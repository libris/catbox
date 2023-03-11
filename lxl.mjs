export const GRAPH = '@graph'
export const ID = '@id'
export const TYPE = '@type'
export const REVERSE = '@reverse'

export class Index {
  constructor(data) {
    this.index = index(data)
    connect(this.index)
  }
  values() {
    return Object.values(this.index.nodes)
  }
  get(id) {
    return this.index.nodes[id]
  }
}

function index(data) {
  const flattened = data[GRAPH]
  const nodes = {}
  const reverses = {}
  for (const node of flattened) {
    const id = node[ID]
    nodes[id] = node
    for (const key in node) {
      for (const o of asArray(node[key])) {
        if (typeof o === 'object' && ID in o) {
          const oId = o[ID]
          let rev = reverses[oId]
          if (rev == null) {
            rev = reverses[oId] = {}
          }
          let subjects = rev[key]
          if (subjects == null) {
            subjects = rev[key] = []
          }
          subjects.push(id)
        }
      }
    }
  }
  return {nodes, reverses}
}

function connect(index) {
  for (const node of Object.values(index.nodes)) {
    connectNode(node, index)
  }
}

function connectNode(node, index) {
  const id = node[ID]
  for (const key in node) {
    let o = node[key]
    if (typeof o === 'object') {
      if (Array.isArray(o)) {
        node[key] = o.map(x =>
          typeof x === 'object' && ID in x ?
          index.nodes[x[ID]] || x :
          x
        )
      } else if (ID in o) {
        node[key] = index.nodes[o[ID]] || o
      }
    }
  }
  const reverses = index.reverses[id]
  if (reverses) {
    const rev = node[REVERSE] = {}
    for (const key in reverses) {
      rev[key] = reverses[key].map(ref => index.nodes[ref])
    }
  }
}

export function asArray(o) {
  return Array.isArray(o) ? o : o == null ? [] : [o]
}

export class LD {
  isA(thing, type) {
    return thing[TYPE] === type
  }
  groupBy(things, key='typeLabel') {
    if (things == null) return []
    let groupsByKey = {}
    for (let thing of things) {
      let g = groupsByKey[thing[key]]
      if (g == null) g = groupsByKey[thing[key]] = []
      g.push(thing)
    }
    return Object.values(groupsByKey)
  }
}
