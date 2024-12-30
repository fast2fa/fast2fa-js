async function verify({ id, accesstoken, phone, payload = {}, fetch: _fetch = fetch }) {
    const url = `https://api.fast2fa.com/verify?id=${id}&accesstoken=${accesstoken}&phone=${phone}`;
    const response = await _fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (data.message) {
        throw new Error(data.message);
    }

    return data.id;
}

async function getStatus({ msgId, fetch: _fetch = fetch }) {
    const url = `https://api.fast2fa.com/status?id=${msgId}`;
    const response = await _fetch(url);
    const data = await response.json();
    return data;
}

async function waitForStatus({ msgId, timeout = 2 * 60 * 1000, fetch: _fetch = fetch }) {
    const result = await new Promise(async (resolve, reject) => {
        let running = true;
        const timer = setTimeout(() => {
            if (!running) return;
            running = false;
            reject(new Error('timeout'));
        }, timeout);

        while (running) {
            const status = await getStatus({ msgId, fetch: _fetch });
            if (running) {
                if (status.status !== 'pending') {
                    running = false;
                    clearTimeout(timer);
                    resolve(status);
                    break;
                }

                await new Promise(res => setTimeout(res, 1000));
            }
        }
    });

    return result;
}

async function verifyAndWaitForStatus({ id, accesstoken, phone, timeout = 2 * 60 * 1000, fetch: _fetch = fetch }) {
    const msgId = await verify({ id, accesstoken, phone, fetch: _fetch });
    const result = await waitForStatus({ msgId, timeout, fetch: _fetch });
    return result.status === 'approved';
}

module.exports = { verify, getStatus, waitForStatus, verifyAndWaitForStatus };