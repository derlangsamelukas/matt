import {Void} from './util.js'

export default function createDatabaseCreator(){

    let addIndex = (store) => (objOrName) => {
        objOrName = 'string' === typeof objOrName ? {name: objOrName} : objOrName
        objOrName.options = objOrName.options || {}
        store.createIndex(objOrName.name, objOrName.name, objOrName.options)
    }

    let createCrud = (db, table) => {
        let o = {
            put: (data) => {
                return new Promise((resolve, reject) => {
                    let tx = db.result.transaction(table, 'readwrite')
                    let store = tx.objectStore(table)
                    store.put(data)
                    tx.oncomplete = (e) => resolve(data)
                    tx.onerror = (e) => reject(e.error)
                })
            },
            get: (indexOrId, what = undefined) => {
                return new Promise((resolve, reject) => {
                    let tx = db.result.transaction(table, "readonly");
                    let store = tx.objectStore(table)
                    let obj = 'undefined' === typeof what ? (what = indexOrId) && store : store.index(indexOrId)
                    let request = obj.get(what)
                    request.onsuccess = () => {
                        let entry = request.result
                        'undefined' === typeof entry ? reject('empty result') : resolve(entry)
                    }
                    request.onerror = (e) => reject(e.error)
                })
            },
            all: (index = null, what = null) => {
                return new Promise((resolve, reject) => {
                    let tx = db.result.transaction(table, "readonly");
                    let store = tx.objectStore(table);
                    let request = index === null ? store.openCursor() : store.index(index).openCursor(IDBKeyRange.only(what))
                    let resultSet = []
                    request.onsuccess = () => {
                        let cursor = request.result
                        if(cursor)
                        {
                            resultSet.push(cursor.value)
                            cursor.continue()
                            return
                        }
                        resolve(resultSet)
                    }
                    request.onerror = (e) => reject(e.error)
                })
            },
            remove: (id) => new Promise((resolve, reject) => {
                let tx = db.result.transaction(table, 'readwrite')
                let store = tx.objectStore(table)
                store.delete(id)
                tx.oncomplete = () => resolve(id)
                tx.onerror = (e) => reject(e.error)
            })
        }

        return o
    }
    
    const actions = {
        create: (db, table) => {
            let store = db.result.createObjectStore(table.name, {keyPath: table.id, autoincrement: table.ai || false})
            table.indexes.forEach(addIndex(store))
        },
        update: (db, table) => {
            let store = db.transaction.objectStore(table.name);
            table.indexes.forEach(addIndex(store))
        },
        drop: Void
    }
    let versions = []
    let o = {
        push: (tables) => {
            versions.push(tables)
            return o
        },
        create: (name) => new Promise((resolve, reject) => {
            let losTablos = versions.reduce((ts, tables) => tables.reduce((ts, t) => t.action === 'create' ? ts.concat([t.name]) : ts, ts), [])
            let db = indexedDB.open(name, versions.length)
            db.onupgradeneeded = (event) => {
                versions.slice(event.oldVersion).forEach((tables) => {
                    tables.forEach((table) => {
                        if('undefined' === typeof actions[table.action])
                        {
                            reject('invalid action key. allowed keys are: ' + Object.keys(actions))
                            return
                        }
                        actions[table.action](db, table)
                    })
                })
            }
            db.onsuccess = () => {
                //db.result
                let o = losTablos.reduce((o, table) => {
                    o[table] = createCrud(db, table)
                    return o
                }, {})
                resolve(o)
            }
            db.onerror = (e) => reject(e.error)
        })
    }
    
    return o
}
