export function getScorm12Bridge(
  launchId: string,
  initUrl: string,
  cmiGetUrl: string,
  cmiSetUrl: string,
  finishUrl: string,
): string {
  return `
(function() {
  var _err = 0;
  var _cache = {};
  window.API = {
    LMSInitialize: function() {
      fetch("${initUrl}", { method: "POST", credentials: "include" }).catch(function(){});
      return "true";
    },
    LMSFinish: function() {
      fetch("${finishUrl}", { method: "PATCH", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:"COMPLETED"}) }).catch(function(){});
      return "true";
    },
    LMSGetValue: function(name) {
      if (_cache[name] !== undefined) return _cache[name];
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "${cmiGetUrl}?name=" + encodeURIComponent(name), false);
      xhr.send();
      if (xhr.status === 200) {
        var json = JSON.parse(xhr.responseText);
        _cache[name] = json.data;
        return json.data;
      }
      _err = 101;
      return "";
    },
    LMSSetValue: function(name, value) {
      _cache[name] = value;
      _err = 0;
      return "true";
    },
    LMSCommit: function() {
      var entries = Object.keys(_cache);
      if (entries.length === 0) return "true";
      fetch("${cmiSetUrl}", { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({values:_cache}) }).catch(function(){});
      return "true";
    },
    LMSGetLastError: function() { return String(_err); },
    LMSGetErrorString: function() { return "No error"; },
    LMSGetDiagnostic: function() { return "No error"; },
  };
})();
`;
}

export function getScorm2004Bridge(
  launchId: string,
  initUrl: string,
  cmiGetUrl: string,
  cmiSetUrl: string,
  finishUrl: string,
): string {
  return `
(function() {
  var _err = 0;
  var _cache = {};
  window.API_1484_11 = {
    Initialize: function() {
      fetch("${initUrl}", { method: "POST", credentials: "include" }).catch(function(){});
      return "true";
    },
    Terminate: function() {
      fetch("${finishUrl}", { method: "PATCH", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:"COMPLETED"}) }).catch(function(){});
      return "true";
    },
    GetValue: function(name) {
      if (_cache[name] !== undefined) return _cache[name];
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "${cmiGetUrl}?name=" + encodeURIComponent(name), false);
      xhr.send();
      if (xhr.status === 200) {
        var json = JSON.parse(xhr.responseText);
        _cache[name] = json.data;
        return json.data;
      }
      _err = 101;
      return "";
    },
    SetValue: function(name, value) {
      _cache[name] = value;
      _err = 0;
      return "true";
    },
    Commit: function() {
      var entries = Object.keys(_cache);
      if (entries.length === 0) return "true";
      fetch("${cmiSetUrl}", { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({values:_cache}) }).catch(function(){});
      return "true";
    },
    GetLastError: function() { return String(_err); },
    GetErrorString: function() { return "No error"; },
    GetDiagnostic: function() { return "No error"; },
  };
})();
`;
}
