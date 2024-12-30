# fast2fa-js
JavaScript package for the easiest and quickest two-factor authentication service [Fast2fa](https://fast2fa.com).

## Installation
```bash
npm install @fast2fa/fast2fa-js
```

## Usage
Once you have registered your account at [Fast2fa](https://fast2fa.com), you can use the following examples to verify phone numbers (for example, for login purposes).

Pick the use case that best suits your needs:
- [Server only (with keeping the client connection open)](#server-only-with-keeping-the-client-connection-open)
- [Server initiates, client polls for status](#server-initiates-client-polls-for-status)
- [Server initiates, client polls for status using your own servers](#server-initiates-client-polls-for-status-using-your-own-servers)

### Server only (with keeping the client connection open)

Here is an example of how to use the `verifyAndWaitForStatus` function in a server-only context, where you can keep the client connection open until the user has verified their phone number (for example, on your own servers). The example uses promises, but you can use async/await if you prefer.

```javascript
const fast2fa = require('@fast2fa/fast2fa-node');
// ...
router.get('/login', (req, res) => {
    // ... Code to check user credentials, and get user phone number

    fast2fa.verifyAndWaitForStatus({
        id: '...', // Fast2fa ID
        accesstoken: '...', // Fast2fa Access Token
        phone: phone, // User phone number
        timeout: 2 * 60 * 1000 // Timeout in milliseconds (default: 2 minutes)

    }).then(result => {
        if (!result) {
            // User did not verify their phone number
            return;
        }

        // All is good. User has verified their phone number.
    }).catch(error => {
        if (error.message === 'timeout') {
            // User did not verify their phone number within the timeout period
            return;
        }
    });
});
```

### Server initiates, client polls (directly with Fast2fa API) for status

Here is an example of how to use the `verify` function in the server, and then use the `waitForStatus` function in the client to poll for the status of the verification. This is useful in situations where it might be inconvenient to keep the client connection open until the user has verified their phone number (for example, in cloud functions and other serverless environments).

**Note**: You can pass a payload that the client will receive in the `waitForStatus` function *only if the user approved the two-factor authentication* (For example, you can pass an authentication token that the client can use to authenticate itself for further requests, only after the user has verified their phone number).

#### Server
```javascript
const fast2fa = require('@fast2fa/fast2fa-node');
// ...
router.get('/login', async (req, res) => {
    // ... Code to check user credentials, and get user phone number

    const msgId = await fast2fa.verify({
        id: '...', // Fast2fa ID
        accesstoken: '...', // Fast2fa Access Token
        phone: phone, // User phone number
        payload: {
            accesstoken: '...', // Access token that the client will receive only after the user has verified their phone number
        }
    });

    // Send the msgId for polling in the client
    res.status(200).json({ msgId });
});
```

#### Client
```javascript
const fast2fa = require('@fast2fa/fast2fa-js');

async function onLogin() {
    const { msgId } = await fetch('/login').then(res => res.json());

    fast2fa.waitForStatus({
        msgId: '...', // msgId received from the server
        timeout: 2 * 60 * 1000 // Timeout in milliseconds (default: 2 minutes)
    }).then(result => {
        if (!result || result.status !== 'approved') {
            // User did not verify their phone number
            return;
        }

        // All is good. User has verified their phone number.
        // You can now use the payload that the user has approved.
        const { accesstoken } = result.payload;
    });
}
```

### Server initiates, client polls for status using your own servers

Here is an example of how to use both the `verify` and the `getStatus` functions in the server, while the client triggers the polling process. This is useful in situations where it might be inconvenient to keep the client connection open until the user has verified their phone number (for example, in cloud functions and other serverless environments), and you want to perform more server tasks after the user has verified their phone number.

#### Server
```javascript
const fast2fa = require('@fast2fa/fast2fa-js');

router.get('/login', async (req, res) => {
    // ... Code to check user credentials, and get user phone number

    const msgId = await fast2fa.verify({
        id: '...', // Fast2fa ID
        accesstoken: '...', // Fast2fa Access Token
        phone: phone, // User phone number
    });

    // Send the msgId for polling in the client
    res.status(200).json({ msgId });
});

router.get('/login-step2', async (req, res) => {
    const { msgId } = req.query;
    const result = await fast2fa.getStatus({ msgId });

    if (result.status === 'pending') {
        res.status(200).json({ status: 'pending' });
        return;
    } else if (result.status === 'denied') {
        res.status(401).json({ status: 'denied' });
        return;
    } else if (result.status !== 'approved') {
        res.status(500).json({ status: 'unknown-error' });
        return;
    }

    // All is good. User has verified their phone number. Perform next tasks.
    // ...
});
```

#### Client
```javascript
async function onLogin() {
    const { msgId } = await fetch('/login').then(res => res.json());

    let status;
    while (true) {
        status = await fetch(`/login-step2?msgId=${msgId}`).then(res => res.json());
        if (status.status === 'pending') {
            await new Promise(res => setTimeout(res, 1000));
        } else {
            break;
        }
    }

    // ...
}
```

