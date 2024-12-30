const { verify, verifyAndWaitForStatus } = require('../src/index.js');
const _ = require('lodash');

test('verify: Sends the REST request with the correct payload', async () => {
    const payload = {
        test: 'test'
    };
    await expect(verify({
        id: '123',
        accesstoken: 'accesstoken123',
        phone: 'phonenumber123',
        timeout: 10000,
        payload,
        fetch: (url, options) => {

            if ((url === 'https://api.fast2fa.com/verify?id=123&accesstoken=accesstoken123&phone=phonenumber123') 
                && (_.isEqual(options.body, JSON.stringify({ payload })))) {
                return Promise.resolve({
                    json: () => ({ id: 'msgid123' })
                });
            }
            return Promise.reject(new Error('Invalid request'));
        }
    })).resolves.toBe('msgid123');
});

test('verify: FAils if the REST request fails', async () => {
    const payload = {
        test: 'test'
    };
    await expect(verify({
        id: '123',
        accesstoken: 'accesstoken123',
        phone: 'phonenumber123',
        timeout: 10000,
        payload,
        fetch: (url, options) => {
            return Promise.reject(new Error('Invalid request'));
        }
    })).rejects.toThrow('Invalid request');
});

test('verifyAndWaitForStatus: Success after a couple of requests', async () => {
    let count = 0;
    await expect(verifyAndWaitForStatus({
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

test('verifyAndWaitForStatus: User said it wasn\'t him', async () => {
    let count = 0;
    await expect(verifyAndWaitForStatus({
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

test('verifyAndWaitForStatus: Timeout during verification', async () => {
    await expect(verifyAndWaitForStatus({
        id: '123',
        accesstoken: '123',
        phone: '123',
        timeout: 2000,
        fetch: () => {
            return new Promise((resolve) => setTimeout(resolve({
                json: () => ({ status: 'pending' })
            }), 1000))
        }
    })).rejects.toThrow('timeout');
});