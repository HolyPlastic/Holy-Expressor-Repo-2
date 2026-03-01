if (typeof Holy !== "object") {
  Holy = {};
}

(function () {
  "use strict";

  var adapter = null;

  function buildAdapter() {
    var csInstance = null;
    var extensionId = "";
    try {
      csInstance = new CSInterface();
      if (csInstance && typeof csInstance.getExtensionID === "function") {
        extensionId = csInstance.getExtensionID();
      }
    } catch (err) {
      csInstance = null;
    }

    var cep = null;
    try {
      cep = (typeof window !== "undefined") ? window.__adobe_cep__ : null;
    } catch (errCep) {
      cep = null;
    }

    function tryGetFromCS(key) {
      if (!csInstance || typeof csInstance.getPersistentData !== "function") {
        return null;
      }
      try {
        return csInstance.getPersistentData(key);
      } catch (err) {
        return null;
      }
    }

    function trySetToCS(key, value) {
      if (!csInstance || typeof csInstance.setPersistentData !== "function") {
        return false;
      }
      try {
        csInstance.setPersistentData(key, value);
        return true;
      } catch (err) {
        return false;
      }
    }

    function tryRemoveFromCS(key) {
      if (!csInstance || typeof csInstance.removePersistentData !== "function") {
        return false;
      }
      try {
        csInstance.removePersistentData(key);
        return true;
      } catch (err) {
        return false;
      }
    }

    function tryGetFromCEP(key) {
      if (!cep || typeof cep.getPersistentData !== "function") {
        return null;
      }
      try {
        return cep.getPersistentData(key, extensionId || "");
      } catch (errScoped) {
        try {
          return cep.getPersistentData(key);
        } catch (err) {
          return null;
        }
      }
    }

    function trySetToCEP(key, value) {
      if (!cep || typeof cep.setPersistentData !== "function") {
        return false;
      }
      try {
        cep.setPersistentData(key, value, extensionId || "");
        return true;
      } catch (errScoped) {
        try {
          cep.setPersistentData(key, value);
          return true;
        } catch (err) {
          return false;
        }
      }
    }

    function tryRemoveFromCEP(key) {
      if (!cep || typeof cep.removePersistentData !== "function") {
        return false;
      }
      try {
        cep.removePersistentData(key, extensionId || "");
        return true;
      } catch (errScoped) {
        try {
          cep.removePersistentData(key);
          return true;
        } catch (err) {
          return false;
        }
      }
    }

    function getLocal(key) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (err) {}
      return null;
    }

    function setLocal(key, value) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
          return true;
        }
      } catch (err) {}
      return false;
    }

    function removeLocal(key) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
          return true;
        }
      } catch (err) {}
      return false;
    }

    return {
      get: function (key) {
        if (!key) return null;
        var value = tryGetFromCS(key);
        if (value != null) return value;
        value = tryGetFromCEP(key);
        if (value != null) return value;
        return getLocal(key);
      },
      set: function (key, value) {
        if (!key) return false;
        var serialized = (value === undefined || value === null) ? "" : String(value);
        if (trySetToCS(key, serialized)) return true;
        if (trySetToCEP(key, serialized)) return true;
        return setLocal(key, serialized);
      },
      remove: function (key) {
        if (!key) return false;
        var removed = tryRemoveFromCS(key);
        var cepRemoved = tryRemoveFromCEP(key);
        var localRemoved = removeLocal(key);
        return !!(removed || cepRemoved || localRemoved);
      },
      describe: function () {
        return {
          hasCS: !!csInstance,
          hasCSMethods: !!(csInstance && typeof csInstance.getPersistentData === "function" && typeof csInstance.setPersistentData === "function"),
          hasCEP: !!cep
        };
      }
    };
  }

  function ensureAdapter() {
    if (!adapter) {
      adapter = buildAdapter();
    }
    return adapter;
  }

  function get(key) {
    return ensureAdapter().get(key);
  }

  function set(key, value) {
    return ensureAdapter().set(key, value);
  }

  function remove(key) {
    return ensureAdapter().remove(key);
  }

  Holy.PERSIST = {
    get: get,
    set: set,
    remove: remove,
    refresh: function () {
      adapter = null;
    }
  };
})();
