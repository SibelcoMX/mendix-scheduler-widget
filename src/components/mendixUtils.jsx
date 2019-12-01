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
 * Get a Mendix Object
 *
 * @name getObject
 * @param guid Object guid of the Mendix Object that you try to return
 */
getObject = (guid) => {
  return new Promise((resolve, reject) => {
      window.mx.data.get({guid: guid, callback: resolve, error: reject});
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
      window.mx.data.commit({mxobj: mxObject, callback: resolve, error: reject});
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

showMendixError = (actionName, error) => {
  if (error && error.message) {
      window.mx.ui.error(`An error occured in ${actionName} :: ${error.message}`);
  }
}
