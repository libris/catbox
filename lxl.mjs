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
          connectNode(x, index)
        )
      } else {
        connectNode(o, index)
        if (ID in o) {
          node[key] = index.nodes[o[ID]] || o
        }
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
  return node
}

export function asArray(o) {
  return Array.isArray(o) ? o : o == null ? [] : [o]
}

export class LD {
  constructor(vocab) {
    this.termIndex = {}
    this.typeBaseIndex = {}
    for (const term of vocab[GRAPH]) {
      if (ID in term) {
        this.termIndex[term[ID]] = term
      }
      if (term.subClassOf && ID in term.subClassOf) {
        this.typeBaseIndex[term[ID]] = term.subClassOf[ID]
      }
    }
  }

  getTerm(id) {
    return this.termIndex[id]
  }

  isA(thing, type) {
    let t = thing[TYPE]
    while (t != null) {
      if (t === type) return true
      let next = this.typeBaseIndex[t]
      if (next === t) break // cycle
      t = next
    }
    return false
  }

  getTypeLabelFor(thing) {
    return this.getTerm(thing[TYPE])?.label
  }

  groupByType(things, category=null) {
    if (things == null) return []
    let termByKey = {}
    let groupsByKey = {}
    for (let thing of things) {
      let t = thing[TYPE]
      let term = this.getTerm(t)
      if (category) {
        term = this.findBaseTermInCategory(term, category) || term
      }
      let key = term[ID]
      let g = groupsByKey[key]
      if (g == null) {
        g = groupsByKey[key] = {term, members: []}
      }
      g.members.push(thing)
    }
    return Object.values(groupsByKey)
  }

  findBaseTermInCategory(term, category) {
    let current = term
    while (current != null) {
      if (current.category === category) break
      let next = this.getTerm(this.typeBaseIndex[current[ID]])
      if (next === current) break // cycle
      current = next
    }
    return current
  }
}
