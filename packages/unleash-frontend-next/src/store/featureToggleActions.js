export const ADD_FEATURE_TOGGLE = 'ADD_FEATURE_TOGGLE';
export const TOGGLE_FEATURE_TOGGLE = 'TOGGLE_FEATURE_TOGGLE';
export const REQUEST_FEATURE_TOGGLES = 'REQUEST_FEATURE_TOGGLES';
export const RECEIVE_FEATURE_TOGGLES = 'RECEIVE_FEATURE_TOGGLES';
export const ERROR_RECEIVE_FEATURE_TOGGLES = 'ERROR_RECEIVE_FEATURE_TOGGLES';
export const ERROR_CREATING_FEATURE_TOGGLE = 'ERROR_CREATING_FEATURE_TOGGLE';

function addFeatureToggle (featureToggle) {
    return {
        type: ADD_FEATURE_TOGGLE,
        featureToggle,
    };
};

function errorCreatingFeatureToggle (statusCode) {
    return {
        type: ERROR_CREATING_FEATURE_TOGGLE,
        statusCode,
        receivedAt: Date.now(),
    };
}

export const toggleFeature = (featureName) => ({
    type: TOGGLE_FEATURE_TOGGLE,
    name: featureName,
});


function requestFeatureToggles () {
    return {
        type: REQUEST_FEATURE_TOGGLES,
    };
}

function receiveFeatureToggles (json) {
    return {
        type: RECEIVE_FEATURE_TOGGLES,
        featureToggles: json.features.map(features => features),
        receivedAt: Date.now(),
    };
}

function errorReceiveFeatureToggles (statusCode) {
    return {
        type: ERROR_RECEIVE_FEATURE_TOGGLES,
        statusCode,
        receivedAt: Date.now(),
    };
}

export function fetchFeatureToggles () {
    return dispatch => {
        dispatch(requestFeatureToggles());
        return fetch('/features')
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    let error = new Error('failed fetching');
                    error.status = response.status;
                    throw error;
                }
            })
            .then(json => dispatch(receiveFeatureToggles(json)))
            .catch(error => dispatch(errorReceiveFeatureToggles(error)));
    };
}


export function createFeatureToggles (featureToggle) {
    return dispatch => {
        dispatch(requestFeatureToggles());
        return fetch('/features', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(featureToggle),
        })
        .then(response => {
            if (!response.ok) {
                let error = new Error('failed fetching');
                error.status = response.status;
                throw error;
            }
        })
        .then(() => dispatch(addFeatureToggle(featureToggle)))
        .catch(error => dispatch(errorCreatingFeatureToggle(error)));
    };
}