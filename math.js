
const createVariable = (name) => {
    return {
        render: (create) => create.variable(name),
        value: name
    }
}

const createSum = (over, under) => {
    return {
        render: (create) => create.sum(over, under)
    }
}
