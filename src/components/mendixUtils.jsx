/**
 * Execute a microflow as Promise
 *
 * @name executeMicroflow
 * @param microflow Microflow name
 */
executeMicroflow = (microFlow) => {
    return new Promise((resolve, reject) => {
        if (!microFlow || microFlow === "") {
            return reject(new Error("Microflow parameter cannot be empty!"));
        }
        try {
            window.mx.data.action({
                params: {
                    actionname: microFlow
                },
                callback: resolve,
                error: reject
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
* Execute a microflow as Promise with one object
*
* @name executeMicroflowWithObject
* @param microflow Microflow name
* @param guid
*/
executeMicroflowWithObject = (microFlow, guid) => {
    return new Promise((resolve, reject) => {
        if (!microFlow || microFlow === "") {
            return reject(new Error("Microflow parameter cannot be empty!"));
        }
        try {
            window.mx.data.action({
                params: {
                    actionname: microFlow,
                    guid: guid
                },
                callback: resolve,
                error: reject
            });
        } catch (error) {
            reject(error);
        }
    });
}

// from here

/**
 * Create a Mendix Object
 *
 * @name createObject
 * @param entity Entity of the object you want to create
 */
createObject = (entity) => {
    return new Promise((resolve, reject) => {
        window.mx.data.create({ entity: entity, callback: resolve, error: reject });
    });
}

/**
 * Delete a Mendix Object
 *
 * @name deleteObject
 * @param guid of the object you want to delete
 */
deleteObject = (guid) => {
    return new Promise((resolve, reject) => {
        window.mx.data.remove({ guid: guid, callback: resolve, error: reject });
    });
}

// to here


/**
 * Get a Mendix Object
 *
 * @name getObject
 * @param guid Object guid of the Mendix Object that you try to return
 */
getObject = (guid) => {
    return new Promise((resolve, reject) => {
        window.mx.data.get({ guid: guid, callback: resolve, error: reject });
    });
}

/**
 * Get a multiple Mendix Objects
 *
 * @name getObjects
 * @param guids Array of Object guids of the Mendix Objects that you try to return
 */
getObjects = (guids) => {
    return new Promise((resolve, reject) => {
        window.mx.data.get({ guids: guids, callback: resolve, error: reject });
    });
}



/**
 * Commit multiple Mendix Objects
 *
 * @name commitObjects
 * @param mxObjects multiple Mendix Objects that will be committed to the server
 */
commitObjects = (mxObjects) => {
    return new Promise((resolve, reject) => {
        window.mx.data.commit({ mxobjs: mxObjects, callback: resolve, error: reject });
    });
}



/**
 * Commit a Mendix Object
 *
 * @name commitObject
 * @param mxObject Mendix Object that will be committed to the server
 */
commitObject = (mxObject) => {
    return new Promise((resolve, reject) => {
        window.mx.data.commit({ mxobj: mxObject, callback: resolve, error: reject });
    });
}

/**
 * Get context from a guid and entityname
 *
 * @name getObjectContextFromId
 * @param guid Mendix Object guid
 * @param entityName Mendix Entity name
 */
getObjectContextFromId = (guid, entityName) => {
    var context = new mendix.lib.MxContext();
    if (guid && entityName) {
        context.setContext(entityName, guid);
    }
    return context;
};

/**
 * Open a page
 *
 * @name openPage
 * @param pageAction Page action containing the `pageName` and optional `openAs`
 * @param context Context that is provided to the page. This is tied to an object
 */
openPage = (pageAction, context) => {
    if (!pageAction.pageName) {
        return Promise.reject(new Error("Page name not provided!"));
    }
    return new Promise((resolve, reject) => {
        window.mx.ui.openForm(pageAction.pageName, {
            location: pageAction.openAs || "popup",
            context,
            callback: resolve,
            error: reject
        });
    });
};

askConfirmation = (question) => {
    return new Promise(resolve => {
        window.mx.ui.confirmation({
            content: question,
            proceed: "OK",
            cancel: "Cancel",
            handler: () => resolve(true),
            onCancel: () => resolve(false)
        });
    });
}

showMendixError = (actionName, error) => {
    if (error && error.message) {
        window.mx.ui.error(`An error occured in ${actionName} :: ${error.message}`);
    }
}

showInfo = (message, modal) => {
    window.mx.ui.info(message, modal);
}

showWarning = (message, modal) => {
    window.mx.ui.warning(message, modal);
}

showError = (message, modal) => {
    window.mx.ui.error(message, modal);
}

showProgress = (message, modal) => {
    var pid = window.mx.ui.showProgress(message, modal);
    return pid;
}

hideProgress = (pid) => {
    window.mx.ui.hideProgress(pid);
}

/**
* Retrieve objects from Mendix by XPath
*
* @name retrieveObjects
* @param module where the entity is in the domain
* @param Entity name of the entity to retrieve
* @param XPath constraints can be empty to retrieve all objects
*/

retrieveObjects = (module, entity, xPath = '') => {
    return new Promise((resolve, reject) => {
        try {
            let fullXpath = '//' + module + '.' + entity + xPath;
            mx.data.get({
                xpath: fullXpath,
                callback: resolve,
                error: reject
            });
        }
        catch (error) {
            reject(error);
        }
    })
}