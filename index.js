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
        if (error.response) {
            if (error.response.status === 404) {
                console.error('Got 404 unauthorized', error.response)
                core.setFailed('Authorization failed: ' + error.response)
                return
            }
        }
        console.error('Caught error', error)
        core.setFailed('Caught error during authentication: ' + error)
    }
}

async function azWriteSensor(siteGuid, sensorName, value_string, endpoint, headers) {
    console.log("Writing sensor <" + sensorName + "> towards endpoint <" + endpoint + "> with headers " + JSON.stringify(headers, null, 2));
    var payloadInside = {
        'sensor_id': sensorName,
        'timestamp': new Date().toISOString()
    }
    payloadInside['valueType'] = 'string';
    payloadInside['type'] = 'string';
    payloadInside['value'] = value_string;
    var payload = [payloadInside];
    let url = endpoint + "/import/" + siteGuid + "/hd";
    try {
        const response = await axios.put(url, payload, headers)
        if (response) {
            if (response.status !== 200) {
                core.setFailed('Error while writing sensor. Server returned ' + response.status);
            }
        } else {
            console.error('Error')
        }
    } catch (error) {
        if (error.response)
            console.error('Caught error while writing sensor. Response only:', response)
        else
            console.error('Caught error while writing sensor. Entire error:', error)
        core.setFailed('Caught error while writing sensor. Error: ' + error)
    }

}

function azTriggerCommand(siteSerial, actionName, commandName) {
    console.debug("azTriggerAction. Action: " + actionName + ". Command: " + commandName + ". Site serial: " + siteSerial);
    return new Promise((resolve, reject) => {
        var payload = {
            'command': commandName,
            'action': actionName,
            'serial': siteSerial
        }
        //console.debug(JSON.stringify(payload, null, 2));
        let url = getBaseUrl() + "/actions";
        //console.debug(getHeaders());
        axios.post(url, payload, getHeaders()).then(
            response => {
                if (response.status !== 200) {
                    console.log(response.status);
                    reject(ERRS.E013 + '. Server return ' + response.status)
                } else if ('exec_uid' in response.data) { //TODO check this
                    //            console.debug(JSON.stringify(response, null, 4));
                    resolve(true);
                } else {
                    reject(ERRS.E014);
                }
            }
        ).catch(
            error => reject(error)//TODO: better //handleAzetiRestApiError(error, azTriggerCommand, arguments)
        );
    });
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
    const site_guid = core.getInput('site_guid')
    const script_name = core.getInput('script_name')
    const sensor_id_operation = '~ EdgeOrchestrator: Operation'
    let headers = azAuthenticateToAzetiApi(username, password, endpoint)
    azWriteSensor(site_guid, sensor_id_operation, null, 'update script ' + script_name, headers)
} catch (error) {
    core.setFailed(error.message);
}