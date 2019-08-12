export const factory = {
    math: (children = []) => {
        return {
            type: 'root',
            children: children
        }
    },
    number: (number) => {
        return {
            type: 'number',
            number: number
        }
    },
    variable: (name, raw = false) => {
        return {
            type: 'variable',
            name: name,
            raw: raw
        }
    },
    operator: (name) => {
        return {
            type: 'operator',
            name: name
        }
    },
    sqrt: (children = []) => {
        return {
            type: 'sqrt',
            children: children
        }
    },
    sum: (top = [], bottom = []) => {
        return {
            type: 'sum',
            top: top,
            bottom: bottom
        }
    },
    fracture: (top = [], bottom = []) => {
        return {
            type: 'fracture',
            top: top,
            bottom: bottom
        }
    },
    brackets: (children = []) => {
        return {
            type: 'brackets',
            children: children
        }
    },
    pow: (top = [], bottom = []) => {
        return {
            type: 'pow',
            top: top,
            bottom: bottom
        }
    }
}

const before = (node, insertMe) => {
    node.parentNode.insertBefore(insertMe, node)
}

const createAtom = (model, node) => {
    const object = {
        node: node,
        isAtom: true,
        buildModel: () => model
    }
    node.matt = object

    return object
}

const createList = (model, nodeName, create, rec, visiblePlaceholder = false) => {
    const childMatts = model.children.map(rec)
    const placeholderNode = create.variable('')
    const placeholder = visiblePlaceholder ? {
        useSpace: () => placeholderUseSpace(placeholderNode),
        useNoSpace: () => placeholderUseNoSpace(placeholderNode)
    } : {
        useSpace: new Function(),
        useNoSpace: new Function(),
    }
    childMatts.length === 0 && placeholder.useSpace()
    const row = create.row(childMatts.map((matt) => matt.node).concat(placeholderNode))
    const mnode = create[nodeName]([row])
    const matt = {
        node: mnode,
        isAtom: false,
        isEmpty: () => childMatts.length === 0,
        insertChild: (newModel, index) => {
            const newMatt = rec(newModel)
            before(row.children[index], newMatt.node)
            childMatts.splice(Math.max(0, index), 0, newMatt)
            placeholder.useNoSpace()
        },
        removeChild: (index) => {
            childMatts.splice(Math.max(0, index), 1)
            row.children[index].remove()
            childMatts.length === 0 && placeholder.useSpace()
        },
        getLength: () => childMatts.length,
        getChild: (index) => index >= 0 && index < childMatts.length ? childMatts[index] : null,
        getNode: (index) => index >= 0 && index < row.children.length ? row.children[index] : null,
        buildModel: () => Object.assign({}, model, {children: childMatts.map((matt) => matt.buildModel())})
    }
    matt.node.matt = matt

    return matt
}

const placeholderUseSpace = (placeholder) => {
    placeholder.innerHTML = '&#8718;'
    placeholder.classList.add('transparent')
}

const placeholderUseNoSpace = (placeholder) => {
    placeholder.textContent = ''
    placeholder.classList.remove('transparent')
}

const createTopBottom = (model, createNode, create, rec) => {
    const topMatts = model.top.map(rec)
    const topPlaceholder = create.variable('')
    const bottomPlaceholder = create.variable('')
    const topRow = create.row(topMatts.map((matt) => matt.node).concat(topPlaceholder))
    
    const bottomMatts = model.bottom.map(rec)
    const bottomRow = create.row(bottomMatts.map((matt) => matt.node).concat(bottomPlaceholder))

    const mnode = createNode(topRow, bottomRow)

    topMatts.length === 0 && placeholderUseSpace(topPlaceholder)
    bottomMatts.length === 0 && placeholderUseSpace(bottomPlaceholder)

    return {
        node: mnode,
        isAtom: false,
        isEmpty: () => topMatts.length === 0 && bottomMatts.length === 0,
        insertChild: (newModel, index) => {
            const newMatt = rec(newModel)
            if(index > topMatts.length)
            {
                bottomMatts.splice(index - topRow.children.length, 0, newMatt)
                before(bottomRow.children[index - topRow.children.length], newMatt.node)
                placeholderUseNoSpace(bottomPlaceholder)
            }
            else
            {
                topMatts.splice(index, 0, newMatt)
                before(topRow.children[index], newMatt.node)
                placeholderUseNoSpace(topPlaceholder)
            }
        },
        removeChild: (index) => {
            if(index > topMatts.length)
            {
                bottomMatts.splice(index - topRow.children.length, 1)
                bottomRow.children[index - topRow.children.length].remove()
                bottomMatts.length === 0 && placeholderUseSpace(bottomPlaceholder)
            }
            else
            {
                topMatts.splice(index, 1)
                topRow.children[index].remove()
                topMatts.length === 0 && placeholderUseSpace(topPlaceholder)
            }
        },
        getLength: () => topMatts.length + bottomMatts.length +1,
        getChild: (index) => {
            return index < 0 || index === topMatts.length ? null :
                index < topMatts.length ?
                topMatts[index] :
                index - topRow.children.length < bottomMatts.length ?
                bottomMatts[index - topRow.children.length] :
                null
        },
        getNode: (index) => {
            return index < 0 ? null :
                index < topRow.children.length ?
                topRow.children[index] :
                index - topRow.children.length < bottomRow.children.length ?
                bottomRow.children[index - topRow.children.length] :
                null
        },
        buildModel: () => Object.assign({}, model, {
            top: topMatts.map((matt) => matt.buildModel()),
            bottom: bottomMatts.map((matt) => matt.buildModel())
        })
    }
}

export const wrappit = (create, model) => {
    const rec = (model) => wrappit(create, model)
    const types = {
        root: () => createList(model, 'math', create, rec),
        sqrt: () => createList(model, 'sqrt', create, rec, true),
        brackets: () => createList(model, 'brackets', create, rec),
        sum: () => {
            const sumSign = create.variable('')
            sumSign.innerHTML = '&Sum;';
            return createTopBottom(model, (topRow, bottomRow) => create.underover(topRow, sumSign, bottomRow), create, rec)
        },
        fracture: () => createTopBottom(model, create.fracture, create, rec),
        pow: () => createTopBottom(model, create.pow, create, rec),
        number: () => createAtom(model, create.number(model.number)),
        variable: () => createAtom(model, create.variable(model.name, model.raw)),
        operator: () => createAtom(model, create.operator(model.name)),
    }

    return types[model.type]()
}
