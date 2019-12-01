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

getObject = (guid) => {
  return new Promise((resolve, reject) => {
      window.mx.data.get({guid: guid, callback: resolve, error: reject});
  });
}

commitObject = (mxObject) => {
  return new Promise((resolve, reject) => {
      window.mx.data.commit({mxobj: mxObject, callback: resolve, error: reject});
  });
}

showMendixError = (actionName, error) => {
  if (error && error.message) {
      window.mx.ui.error(`An error occured in ${actionName} :: ${error.message}`);
  }
}
