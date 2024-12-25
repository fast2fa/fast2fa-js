const { verify } = require('../src/index.js');

test('Full flow, succeded after a couple of requests', async () => {
    let count = 0;
    await expect(verify({
        id: '123',
        accesstoken: 'accesstoken123',
        phone: 'phonenumber123',
        timeout: 10000,
        fetch: (url) => {

            if (url === 'https://api.fast2fa.com/verify?id=123&accesstoken=accesstoken123&phone=phonenumber123') {
                return Promise.resolve({
                    json: () => ({ id: 'msgid123' })
                });
            }
            if (url === 'https://api.fast2fa.com/status?id=msgid123') {
                return Promise.resolve({
                    json: () => ({ status: count++ === 2 ? 'approved' : 'pending' })
                });
            }
            return Promise.reject(new Error('Invalid URL'));
        }
    })).resolves.toBe(true);
});

test('Full flow, user said it wasn\'t him', async () => {
    let count = 0;
    await expect(verify({
        id: '123',
        accesstoken: 'accesstoken123',
        phone: 'phonenumber123',
        timeout: 10000,
        fetch: (url) => {

            if (url === 'https://api.fast2fa.com/verify?id=123&accesstoken=accesstoken123&phone=phonenumber123') {
                return Promise.resolve({
                    json: () => ({ id: 'msgid123' })
                });
            }
            if (url === 'https://api.fast2fa.com/status?id=msgid123') {
                return Promise.resolve({
                    json: () => ({ status: count++ === 2 ? 'denied' : 'pending' })
                });
            }
            return Promise.reject(new Error('Invalid URL'));
        }
    })).resolves.toBe(false);
});

test('Timeout during verification', async () => {
    await expect(verify({
        id: '123',
        accesstoken: '123',
        phone: '123',
        timeout: 2000,
        fetch: () => {
            return new Promise((resolve) => setTimeout(resolve({
                json: () => ({ status: 'pending' })
            }), 1000))
        }
    })).rejects.toThrow('Timeout');
});