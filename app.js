import {Void} from './util.js'
import {factory, wrappit} from './model.js'
import * as storageProvider from './storage.js'

const storage = storageProvider.local()

const modelFactory = factory

export function go(root, create){
    const box = document.createElement('div')
    box.classList.add('box')
    box.setAttribute('spellcheck', false)
    root.appendChild(box)
    storageProvider.idb().then(function(database){
        showSubjects(box, database, create)
    })
    // storage.load().then((defintion) => {
    //     const model = modelFactory.math(defintion.children || [])
    //     const title = document.createElement('h2')
    //     title.setAttribute('contenteditable', true)
    //     title.textContent = defintion.title || 'Hej'
    //     box.appendChild(title)
    //     const typing = gogo(box, create, model, (matt) => storage.store({title: title.textContent, children: matt.children}))
    //     title.addEventListener('focusin', typing.unsubscribe)
    //     title.addEventListener('focusout', typing.subscribe)
    // })
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
                else if(pos.matt.isEmpty() && pos.matt !== rootMatt)
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
            k: () => insertVar('k', cursor, pos),
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
                    const cut = getChildAtPos(copy).buildModel()
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
            E: () => {
                pos.matt.insertChild(modelFactory.sum(), pos.index)
                pos = moveRight(cursor, pos)
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
    //subscribe()
    cursor.visible.classList.add('hide-me')

    root.setAttribute('tabindex', 0)
    root.addEventListener('focusin', () => {
        subscribe()
        cursor.visible.classList.remove('hide-me')
    })
    root.addEventListener('focusout', () => {
        unsubscribe()
        cursor.visible.classList.add('hide-me')
    })

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

const showSubjects = (box, database, create) => {
    database.subjects.all().then((subjects) => {
        box.innerHTML = ''
        const list = document.createElement('div')
        list.classList.add('list')
        const button = createButton('new subject', () => {
            prompt('enter subject name: ', (name) => {
                const subject = {id: new Date().getTime(), name, content: 'nothing yet'}
                database.subjects.put(subject).then(() => renderSubject(subject))
            })
        })
        const renderSubject = (subject) => {
            const node = document.createElement('div')
            node.classList.add('item')
            node.textContent = subject.name
            list.appendChild(node)
            node.addEventListener('click', () => {
                showSubject(box, database, subject, create)
            })
        }
        box.appendChild(list)
        box.appendChild(button)
        subjects.forEach(renderSubject)
        //database.subjects.put({id: new Date().getTime(), name: 'Ana', content: 'xx'})
    })
}

const showSubject = (box, database, subject, create) => {
    database.sections.all('subject', subject.id).then((sections) => {
        const list = document.createElement('div')
        list.classList.add('list')
        const button = createButton('new subject', () => {
            prompt('enter section name: ', (name) => {
                const section = {id: new Date().getTime(), name, content: 'nothing yet', subject: subject.id}
                sections.push(section)
                database.sections.put(section).then(() => renderSection(section))
            })
        })
        const renderSection = (section) => {
            const node = document.createElement('div')
            node.classList.add('item')
            node.textContent = section.name
            list.appendChild(node)
            node.addEventListener('click', () => {
                showSection(box, database, section, create, () => {
                    showSubject(box, database, subject, create)
                })
            })
        }
        box.innerHTML = ''
        box.appendChild(createTitle(subject.name, (name) => database.subjects.put(Object.assign(subject, {name}))))
        box.appendChild(createDescription(subject.content, (content) => database.subjects.put(Object.assign(subject, {content}))))
        box.appendChild(list)
        box.appendChild(button)
        const back = () => {
            showSubjects(box, database, create)
        }
        box.appendChild(createBackArrow(back))
        box.appendChild(createDelete('subject ' + subject.name, () => {
            database.subjects.remove(subject.id)
            sections.forEach((section) => database.sections.remove(section.id))
            back()
        }))
        sections.forEach(renderSection)
    })
}

const showSection = (box, database, section, create, back) => {
    const list = document.createElement('div')
    list.classList.add('list')
    const button = createButton('new equation', () => {
        const equation = {id: new Date().getTime(), matt: '[]', section: section.id}
        database.equations.put(equation).then(() => renderEquation(equation))
    })
    let equations = []
    const renderEquation = (equation) => {
        equations.push(equation)
        const node = document.createElement('div')
        node.classList.add('equation')
        gogo(node, create, modelFactory.math(JSON.parse(equation.matt)), (matt) => {
            database.equations.put(Object.assign({}, equation, {matt: JSON.stringify(matt.children)}))
        })
        node.appendChild(createDelete('equation', () => database.equations.remove(equation.id) && node.remove()))
        list.appendChild(node)
    }
    database.equations.all('section', section.id).then((equations) => equations.forEach(renderEquation))
    box.innerHTML = ''
    box.appendChild(createTitle(section.name))
    box.appendChild(createDescription(section.content))
    box.appendChild(list)
    box.appendChild(button)
    box.appendChild(createBackArrow(back))
    box.appendChild(createDelete('section ' + section.name, () => {
        database.sections.remove(section.id)
        equations.forEach((equation) => database.equations.remove(equation.id))
        back()
    }))
}

const delayEvent = (g) => {
    let f = Void
    return () => {
        f()
        const handle = window.setTimeout(() => {
            g()
            f = Void
        }, 500)
        f = () => window.clearTimeout(handle)
    }
}

const createTitle = (label, oninput = Void) => {
    const title = document.createElement('div')
    const trigger = delayEvent(() => oninput(title.textContent))
    title.classList.add('title')
    title.textContent = label
    title.setAttribute('contenteditable', true)
    title.addEventListener('input', trigger)
    
    return title
}

const createDescription = (description, oninput = Void) => {
    const node = document.createElement('div')
    const trigger = delayEvent(() => oninput(Array.from(node.childNodes).map((node) => node.textContent.trim()).join('\n')))
    node.classList.add('some-text')
    node.setAttribute('contenteditable', true)
    node.addEventListener('input', trigger)

    description.split('\n').forEach((line) => {
        const lineNode = document.createElement('div')
        lineNode.textContent = line.trim()
        lineNode.textContent === '' && (lineNode.innerHTML = '&nbsp;')
        node.appendChild(lineNode)
    })
    
    return node
}

const createButton = (label, onclick) => {
    const button = document.createElement('div')
    button.classList.add('yes-i-am-a-button')
    button.textContent = label
    button.addEventListener('click', onclick || Void)

    return button
}

const withModal = (f) => {
    const modal = document.createElement('div')
    const inner = document.createElement('div')
    
    inner.classList.add('inner')
    modal.classList.add('the-modal')
    modal.appendChild(inner)
    const _ = (f(modal) || []).forEach((child) => inner.appendChild(child))
    document.body.appendChild(modal)
}

const confirm = (label, f) => withModal((modal) => {
    return [
        createTitle(label),
        createButton('ok', () => modal.remove() || f()),
        createButton('cancel', () => modal.remove())
    ]
})

const prompt = (label, onsubmit) => withModal((modal) => {
    const input = document.createElement('input')
    const onclick = () => input.value !== '' && (modal.remove() || onsubmit(input.value))
    input.addEventListener('keyup', (event) => event.key === 'Enter' && onclick())
    input.type = 'text'
    input.classList.add('the-input')

    return [
        createTitle(label),
        input,
        createButton('ok', onclick),
        createButton('cancel', () => modal.remove())
    ]
})


const createBackArrow = (onclick) => {
    const arrow = document.createElement('div')
    arrow.classList.add('back')
    arrow.addEventListener('click', onclick)

    return arrow
}

const createDelete = (name, onclick = Void) => {
    const node = document.createElement('div')
    node.classList.add('delete')
    node.addEventListener('click', () => confirm('delete ' + name + '?', onclick))

    return node
}
