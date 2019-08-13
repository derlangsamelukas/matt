import createDatabaseCreator from './database.js'

function post(url, data)
{
	return new Promise(function(resolve, reject){
        const xhr = new XMLHttpRequest();
        xhr.onerror = function(){
            reject(xhr.statusText);
        };
        xhr.onload = function(){
            resolve(JSON.parse(xhr.responseText));
        };
        xhr.open('POST', url);
        //xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(data));
    });
}

const removeNulls = (equations) => equations.filter((equation) => equation !== null)

export let remote = () => ({
    store: (equations) => {
        post('http://localhost:4301/equations/store', equations)
        return Promise.resolve()
    },
    load: () => {
        return post('http://localhost:4301/equations/load', {}).then(removeNulls)
    }
})

export let local = () => ({
    store: (equations) => {
        window.localStorage.setItem('equations', JSON.stringify(equations))
        return Promise.resolve()
    },
    load: () => {
        return Promise.resolve(JSON.parse(window.localStorage.getItem('equations') || '{}'))
    }
})

export let idb = () => {
    const creator = createDatabaseCreator()
    creator.push([
        {name: 'subjects', id: 'id', ai: true, indexes: ['name', 'content'], action: 'create'},
        {name: 'sections', id: 'id', ai: true, indexes: ['name', 'content', 'subject'], action: 'create'},
        {name: 'equations', id: 'id', ai: true, indexes: ['matt', 'section'], action: 'create'},
    ])
    const database = creator.create('equations')
    return database   
}
