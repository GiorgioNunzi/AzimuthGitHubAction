const core = require('@actions/core');
const github = require('@actions/github');
const { default: axios } = require('axios');

async function azAuthenticateToAzetiApi(username, password, endpoint) {
    console.log("Authenticating towards endpoint " + endpoint + " with username " + username.substring(0, 3) + "*** ...");
    let payload = { 'username': username, 'password': password }
    var headers = {
        'X-Requested-With': 'XMLHttpRequest'
    };
    let url = endpoint + "/authentication/auth";
    try {
        const response = await axios.post(url, payload, headers)
        if (response.status !== 200) {
            core.setFailed("Error while authenticating. Code: " + response.status);
            return;
        }
        if (!('token' in response.data)) {
            core.setFailed('No taken received during authentication.')
            return;
        }
        var token = response.data['token']
        console.log("Authentication successful. Token: " + token);
        axiosHeaders = {
            headers: { // really need to put headers inside the object, double checked already
                'X-Authorization': token,
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        return axiosHeaders
    } catch (error) {
        console.error('Caught error', error)
        core.setFailed('Caught error during authentication.')
    }
}

async function azWriteSensor(siteGuid, sensorName, value_float, value_string, returnHandler) {
    console.log("Writing sensor: " + sensorName);
    var payloadInside = {
        'sensor_id': sensorName,
        'timestamp': new Date().toISOString()
    }
    if (value_string != null) {
        payloadInside['valueType'] = 'string';
        payloadInside['type'] = 'string';
        payloadInside['value'] = value_string;
    } else {
        payloadInside['valueType'] = 'float'
        payloadInside['type'] = 'float'
        payloadInside['value'] = value_float
    }
    var payload = [payloadInside];
    let url = getBaseUrl() + "/import/" + siteGuid + "/hd";
    try {
        const response = await axios.put(url, payload, getHeaders())
        if (response) {
            if (response.status !== 200) {
                console.error('Error. Server returned ' + response.status);
            }
        } else {
            console.error('Error')
        }
    } catch (error) {
        console.error('Caught error', error)
    }

}

try {
    // // `who-to-greet` input defined in action metadata file
    // const nameToGreet = core.getInput('who-to-greet');
    // console.log(`Hello ${nameToGreet}!`);
    // const time = (new Date()).toTimeString();
    // core.setOutput("time", time);
    // Get the JSON webhook payload for the event that triggered the workflow
    // const payload = JSON.stringify(github.context.payload, undefined, 2)
    // console.log(`The event payload: ${payload}`);
    const username = core.getInput('username')
    const password = core.getInput('password')
    const endpoint = core.getInput('endpoint')
    azAuthenticateToAzetiApi(username, password, endpoint)
} catch (error) {
    core.setFailed(error.message);
}