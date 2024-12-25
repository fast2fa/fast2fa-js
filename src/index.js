async function verify({ id, accesstoken, phone, timeout = 2 * 60 * 1000, fetch: _fetch = fetch }) {
    const url = `https://api.fast2fa.com/verify?id=${id}&accesstoken=${accesstoken}&phone=${phone}`;
    const response = await _fetch(url);
    const data = await response.json();

    if (data.message) {
        throw new Error(data.message);
    }

    const result = await new Promise(async (resolve, reject) => {
        let running = true;
        const timer = setTimeout(() => {
            if (!running) return;
            running = false;
            reject(new Error('Timeout'));
        }, timeout);

        while (running) {
            const status = await _fetch(`https://api.fast2fa.com/status?id=${data.id}`);
            const statusData = await status.json();
            if (running) {
                if (statusData.status !== 'pending') {
                    running = false;
                    clearTimeout(timer);
                    resolve(statusData);
                    break;
                }

                await new Promise(res => setTimeout(res, 1000));
            }
        }
    });

    return result.status === 'approved';
}

module.exports = { verify };