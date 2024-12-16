module.exports = {
    prefix: 'r!',
    presence: {
        activities: [
            { name: 'r!help ', type: 'LISTENING' }, 
            { name: 'r!help para comandos', type: 'WATCHING' }
        ],
        status: 'idle' 
    }
};