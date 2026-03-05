const twilio = require('twilio');
const { config } = require('../config');
const { getSetting } = require('./settings');

let client = null;
let lastCredHash = null;

async function getCredentials() {
  const dbSid = await getSetting('twilio.account_sid');
  const dbToken = await getSetting('twilio.auth_token');

  const sid = dbSid || config.twilio.accountSid;
  const token = dbToken || config.twilio.authToken;

  if (!sid || !token) {
    throw new Error('Twilio credentials not configured. Set them in Admin > Settings.');
  }

  return { sid, token };
}

async function getClient() {
  const { sid, token } = await getCredentials();
  const credHash = `${sid}:${token}`;

  if (!client || credHash !== lastCredHash) {
    client = twilio(sid, token);
    lastCredHash = credHash;
  }

  return client;
}

async function lookupNumber(phoneNumber) {
  try {
    const twilioClient = await getClient();
    const result = await twilioClient.lookups.v2
      .phoneNumbers(phoneNumber)
      .fetch({ fields: 'caller_name,line_type_intelligence' });

    return {
      phoneNumber: result.phoneNumber,
      countryCode: result.countryCode,
      callerName: result.callerName?.caller_name || null,
      callerType: result.callerName?.caller_type || null,
      carrierName: result.lineTypeIntelligence?.carrier_name || null,
      carrierType: result.lineTypeIntelligence?.type || null,
      mobileCountryCode: result.lineTypeIntelligence?.mobile_country_code || null,
      mobileNetworkCode: result.lineTypeIntelligence?.mobile_network_code || null,
      lineType: result.lineTypeIntelligence?.type || null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      phoneNumber,
      countryCode: null,
      callerName: null,
      callerType: null,
      carrierName: null,
      carrierType: null,
      mobileCountryCode: null,
      mobileNetworkCode: null,
      lineType: null,
      errorMessage: error.message || 'Lookup failed',
    };
  }
}

module.exports = { lookupNumber };
