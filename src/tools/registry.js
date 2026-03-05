const tools = Object.freeze([
  Object.freeze({
    id: 'cnam-lookup',
    name: 'CNAM Lookup',
    description: 'Phone number carrier & caller name lookup via Twilio',
    icon: 'phone',
    path: '#/tools/cnam',
    requiredSettings: ['twilio.account_sid', 'twilio.auth_token'],
    version: '1.0.0',
  }),
]);

function getTools() {
  return tools;
}

function getToolById(id) {
  return tools.find((t) => t.id === id) || null;
}

module.exports = { getTools, getToolById };
