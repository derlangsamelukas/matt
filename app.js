import {factory, wrappit} from './model.js'
import * as storageProvider from './storage.js'

const storage = storageProvider.local

const modelFactory = factory

export function go(root, create){
    const box = document.createElement('div')
    storage.load().then((defintion) => {
        const model = modelFactory.math(defintion.children || [])
        box.classList.add('box')
        box.setAttribute('spellcheck', false)
        const title = document.createElement('h2')
        title.setAttribute('contenteditable', true)
        title.textContent = defintion.title || 'Hej'
        box.appendChild(title)
        const typing = gogo(box, create, model, (matt) => storage.store({title: title.textContent, children: matt.children}))
        title.addEventListener('focusin', typing.unsubscribe)
        title.addEventListener('focusout', typing.subscribe)
        root.appendChild(box)
    })
}

const before = (node, insertMe) => {
    node.parentNode.insertBefore(insertMe, node)
}

const createCursor = (create) => {
    const cursor = document.createElement('div')
    const placeholderNode = create.variable('')
    cursor.classList.add('cursor')
    placeholderNode.classList.add('cursor-placeholder')
    //placeholderNode.innerHTML = '&nbsp;'
    const object = {
        visible: cursor,
        hidden: placeholderNode,
        update: () => {
            const rect = object.hidden.getBoundingClientRect()
            cursor.style.height = rect.height
            cursor.style.transform = 'translate(' + rect.x + 'px, ' + rect.y + 'px)'
        },
        startJump: () => object.visible.classList.add('jump'),
        endJump: () => object.visible.classList.remove('jump'),
    }
    
    return object
}

const renderCursor = (cursor, pos) => {
    // cursor.hidden.remove()
    //pos.model.setCursor(cursor.hidden, pos.index)
    cursor.hidden = getNodeAtPos(pos)
    cursor.update()
}

const isAtChild = (pos) => {
    return pos.matt.getChild(pos.index) !== null
}

const isAtNode = (pos) => {
    return pos.matt.getNode(pos.index) !== null
}

const childHasChildren = (pos) => {
    return isAtChild(pos) && pos.matt.getChild(pos.index).isAtom === false
}

const getChildAtPos = (pos) => {
    return pos.matt.getChild(pos.index)
}

const getNodeAtPos = (pos) => {
    return pos.matt.getNode(pos.index)
}

const insertNum = (number, cursor, pos) => {
    pos.matt.insertChild(modelFactory.number(number), pos.index)
    pos = moveRight(cursor, pos)
}

const insertVar = (ch, cursor, pos, raw = false) => {
    pos.matt.insertChild(modelFactory.variable(ch, raw), pos.index)
    pos = moveRight(cursor, pos)
}

const insertOp = (operator, cursor, pos) => {
    pos.matt.insertChild(modelFactory.operator(operator), pos.index)
    pos = moveRight(cursor, pos)
}

const gogo = (root, create, model, store) => {
    const rootMatt = wrappit(create, model)
    const cursor = createCursor(create)
    cursor.startJump()
    root.appendChild(rootMatt.node)
    root.appendChild(cursor.visible)
    var pos = {
        matt: rootMatt,
        index: rootMatt.getLength(),
        up: () => Object.assign({}, pos, {index: Math.max(0, Math.min(pos.matt.getLength(), pos.index))})
    }
    window.requestAnimationFrame(() => {
        renderCursor(cursor, pos)
        window.requestAnimationFrame(cursor.endJump)
    })
    const keydown = (event) => {
        const keymap = {
            ArrowLeft: () => {pos = moveLeft(cursor, pos)},
            ArrowRight: () => {pos = moveRight(cursor, pos)},
            Backspace: () => {
                const copy = Object.assign({}, pos, {index: pos.index -1})
                if(isAtChild(copy))
                {
                    pos = copy
                    pos.matt.removeChild(pos.index)
                    renderCursor(cursor, pos)
                }
                else if(pos.matt.isEmpty())
                {
                    const newPos = pos.up(-1)
                    if(newPos !== pos)
                    {
                        pos = newPos
                        pos.matt.removeChild(pos.index)
                        renderCursor(cursor, pos)
                    }
                }
            },
            x: () => insertVar('x', cursor, pos),
            y: () => insertVar('y', cursor, pos),
            z: () => insertVar('z', cursor, pos),
            a: () => insertVar('a', cursor, pos),
            b: () => insertVar('b', cursor, pos),
            c: () => insertVar('c', cursor, pos),
            n: () => insertVar('n', cursor, pos),
            m: () => insertVar('m', cursor, pos),
            g: () => insertVar('g', cursor, pos),
            i: () => insertVar('i', cursor, pos),
            e: () => insertVar('e', cursor, pos),
            f: () => insertVar('&fnof;', cursor, pos, true),
            p: () => insertVar('&pi;', cursor, pos, true),
            '+': () => insertOp('+', cursor, pos),
            '-': () => insertOp('-', cursor, pos),
            '*': () => insertOp('*', cursor, pos),
            '=': () => insertOp('=', cursor, pos),
            '^': () => {
                const copy = Object.assign({}, pos, {index: pos.index -1})
                if(isAtChild(copy))
                {
                    console.log('before')
                    const cut = getChildAtPos(copy).buildModel()
                    console.log('after')
                    copy.matt.removeChild(copy.index)
                    pos = moveLeft(cursor, pos)
                    pos.matt.insertChild(modelFactory.pow([modelFactory.number(2)], [cut]), pos.index)
                    pos = moveRight(cursor, pos)
                }
            },
            q: () => {
                pos.matt.insertChild(modelFactory.sqrt(), pos.index)
                pos = moveRight(cursor, pos)
            },
            '(': () => {
                pos.matt.insertChild(modelFactory.brackets(), pos.index)
                pos = moveRight(cursor, pos)
            },
            '/': () => {
                pos.matt.insertChild(modelFactory.fracture(), pos.index)
                pos = moveRight(cursor, pos)
                event.preventDefault()
            },
            s: () => {
                store(rootMatt.buildModel())
            }
        }
        Array.from(new Array(10), (_, i) => (keymap[i] = () => insertNum(i, cursor, pos)))
        Reflect.has(keymap, event.key) && keymap[event.key]()
    }
    const subscribe = () => window.addEventListener('keydown', keydown)
    const unsubscribe = () => window.removeEventListener('keydown', keydown)
    subscribe()

    return {subscribe, unsubscribe}
}

const moveLeft = (cursor, pos) => {
    pos.index--
    if(isAtChild(pos))
    {
        if(childHasChildren(pos))
        {
            const oldPos = Object.assign({}, pos)
            pos.matt = getChildAtPos(pos)
            pos.index = pos.matt.getLength()
            pos.up = createMoveUp(oldPos)
        }
    }
    else if(!isAtNode(pos))
    {
        pos = pos.up(-1)
    }
    renderCursor(cursor, pos)

    return pos
}

const moveRight = (cursor, pos) => {
    const copy = Object.assign({}, pos, {index: pos.index +1})
    if(isAtChild(pos) && childHasChildren(pos))
    {
        const oldPos = Object.assign({}, pos)
        pos.matt = getChildAtPos(pos)
        pos.index = 0
        pos.up = createMoveUp(oldPos)
    }
    else if(isAtNode(copy))
    {
        pos.index++
    }
    else
    {
        pos = pos.up(1)
    }
    renderCursor(cursor, pos)

    return pos
}

const createMoveUp = (oldPos) => (dir) => {
    const pos = Object.assign(oldPos, {index: oldPos.index + Math.sign(dir +1)})
    return pos
}
