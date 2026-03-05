window.app = (function () {
  let currentUser = null;
  const routes = {};

  function register(hash, renderFn, options = {}) {
    routes[hash] = { render: renderFn, ...options };
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  function getUser() {
    return currentUser;
  }

  function setUser(user) {
    currentUser = user;
    const navbar = document.getElementById('navbar');
    if (user) {
      navbar.classList.remove('hidden');
      navbar.innerHTML = components.renderNavbar(user);
      navbar.querySelector('#logout-btn').addEventListener('click', async () => {
        await api.post('/auth/logout');
        currentUser = null;
        navbar.classList.add('hidden');
        navigate('#/login');
      });
    } else {
      navbar.classList.add('hidden');
      navbar.innerHTML = '';
    }
  }

  async function handleRoute() {
    const hash = window.location.hash || '#/';
    const content = document.getElementById('page-content');

    if (!currentUser && hash !== '#/login') {
      navigate('#/login');
      return;
    }
    if (currentUser && hash === '#/login') {
      navigate('#/');
      return;
    }

    const route = routes[hash];
    if (route) {
      if (route.admin && currentUser?.role !== 'admin') {
        content.innerHTML = '<div class="empty-state"><h2>Access Denied</h2><p>Admin access required.</p></div>';
        return;
      }
      await route.render(content);
    } else {
      content.innerHTML = '<div class="empty-state"><h2>404</h2><p>Page not found.</p></div>';
    }
  }

  async function init() {
    try {
      const res = await api.get('/auth/me');
      if (res.success) {
        setUser(res.user);
      }
    } catch {
      // Not authenticated
    }

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { register, navigate, getUser, setUser };
})();
