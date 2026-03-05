const twilio = require('twilio');
const { config } = require('../config');

let client = null;

function getClient() {
  if (!client) {
    client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return client;
}

async function lookupNumber(phoneNumber) {
  const twilioClient = getClient();

  try {
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
