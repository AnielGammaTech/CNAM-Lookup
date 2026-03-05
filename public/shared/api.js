window.api = (function () {
  async function request(method, path, body) {
    const opts = {
      method,
      headers: {},
      credentials: 'same-origin',
    };

    if (body && !(body instanceof FormData)) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
      opts.body = body;
    }

    const res = await fetch(`/api${path}`, opts);

    if (res.status === 401) {
      window.location.hash = '#/login';
      return { success: false, error: 'Session expired' };
    }

    return res.json();
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    del: (path) => request('DELETE', path),
    upload: (path, formData) => request('POST', path, formData),
  };
})();
