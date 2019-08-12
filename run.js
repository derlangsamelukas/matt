import {go} from './app.js'

window.onload = () => {
    const root = document.querySelector('#app')
    const mathNodeToCopy = document.querySelector('#math-dummy')
    go(root, creators(mathNodeToCopy))
}

function creators(dummyRoot)
{
    return {
        math: (children = []) => {
            const mnode = dummyRoot.cloneNode(false)
            mnode.removeAttribute('id')
            mnode.className = ''
            children.forEach((child) => mnode.appendChild(child))
            return mnode
        },
        sqrt: (children = []) => {
            const mnode = dummyRoot.querySelector('msqrt').cloneNode(false)
            children.forEach((child) => mnode.appendChild(child))
            return mnode
        },
        underover: (top, center, bottom) => {
            const mnode = dummyRoot.querySelector('munderover').cloneNode(false)
            
            mnode.appendChild(center)
            mnode.appendChild(bottom)
            mnode.appendChild(top)
            
            return mnode
        },
        variable: (name, raw = false) => {
            const mnode = dummyRoot.querySelector('mi').cloneNode(false)
            mnode[raw ? 'innerHTML' : 'textContent'] = name

            return mnode
        },
        number: (number) => {
            const mnode = dummyRoot.querySelector('mn').cloneNode(false)
            mnode.textContent = number.toString()
            
            return mnode
        },
        string: (string) => {
            const mnode = dummyRoot.querySelector('mtext').cloneNode(false)
            mnode.textContent = string
            
            return mnode
        },
        operator: (operator) => {
            const mnode = dummyRoot.querySelector('mo').cloneNode(false)
            mnode.textContent = operator
            
            return mnode
        },
        pow: (center, top) => {
            const mnode = dummyRoot.querySelector('msup').cloneNode(false)
            mnode.appendChild(top)
            mnode.appendChild(center)

            return mnode
        },
        sum: (over, under) => {
            const mnode = dummyRoot.querySelector('munderover').cloneNode(false)
            const mo = dummyRoot.querySelector('mo').cloneNode(false)
            const mi = dummyRoot.querySelector('mi').cloneNode(false)
            const mrow = dummyRoot.querySelector('mrow').cloneNode(false)
            mo.innerHTML = '&Sum;';
            mi.textContent = over
            mrow.textContent = under

            mnode.appendChild(mo)
            mnode.appendChild(mrow)
            mnode.appendChild(mi)

            return mnode
        },
        row: (children = []) => {
            const mnode = dummyRoot.querySelector('mrow').cloneNode(false)
            children.forEach((child) => mnode.appendChild(child))

            return mnode
        },
        fracture: (top, bottom) => {
            const mnode = dummyRoot.querySelector('mfrac').cloneNode(false)
            mnode.appendChild(top)
            mnode.appendChild(bottom)

            return mnode
        },
        brackets: (children = []) => {
            const mnode = dummyRoot.querySelector('mfenced').cloneNode(false)
            children.forEach((child) => mnode.appendChild(child))
            
            return mnode
        }
    }
}
