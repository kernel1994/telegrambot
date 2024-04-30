/**
 * https://github.com/cvzi/telegram-bot-cloudflare
 */

import { RealInterestRate } from './rate.js';

const WEBHOOK = '/endpoint';
const TOKEN = ENV_BOT_TOKEN; // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const SECRET = ENV_BOT_SECRET; // A-Z, a-z, 0-9, _ and -

/**
 * Wait for requests to the worker
 */
addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event));
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET));
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event));
  } else {
    event.respondWith(new Response('No handler for this request'));
  }
});

/**
 * Handle requests to WEBHOOK
 * https://core.telegram.org/bots/api#update
 */
async function handleWebhook(event) {
  // Check secret
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 });
  }

  // Read request body synchronously
  const update = await event.request.json();
  // Deal with response asynchronously
  event.waitUntil(onUpdate(update));

  return new Response('Ok');
}

/**
 * Handle incoming Update
 * https://core.telegram.org/bots/api#update
 */
async function onUpdate(update) {
  if ('message' in update) {
    await onMessage(update.message);
  }
}

/**
 * Handle incoming Message
 * https://core.telegram.org/bots/api#message
 */
function onMessage(message) {
  console.log(`[onMessage]message.text=${message.text}`)
  const paramsArray = message.text.split(':');
  if (paramsArray[0] === 'rate') {
    return sendInterestRateCsv(message.chat.id, paramsArray[1]);
  } else {
    const helpText = 'command:\n- rate:m=monthly;a=amount;p=period';
    return sendPlainText(message.chat.id, helpText);
  }
}

/**
 * Send plain text message
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendPlainText(chatId, text) {
  return (
    await fetch(
      apiUrl('sendMessage', {
        chat_id: chatId,
        text,
      }),
    )
  ).json();
}

async function sendInterestRateCsv(chatId, paramsText) {
  const paramsArray = paramsText.split(';');
  const params = {};
  paramsArray.forEach((pair) => {
    const [param, value] = pair.split('=');
    params[param] = parseFloat(value); // Convert value to a number
  });

  const rate = new RealInterestRate(params['m'], params['a'], params['p']);
  const csvData = rate.csv(); // Get CSV data
  const csvBlob = new Blob([csvData], { type: 'text/csv' }); // Create a blob with CSV data
  const formData = new FormData(); // Create FormData to send file
  formData.append('chat_id', chatId);
  formData.append(
    'document',
    csvBlob,
    `interest_rates_${params['m']}-${params['a']}-${params['p']}.csv`,
  );
  return (
    await fetch(apiUrl('sendDocument'), {
      method: 'POST',
      body: formData,
    })
  ).json();
}

/**
 * Set webhook to this worker's url
 * https://core.telegram.org/bots/api#setwebhook
 */
async function registerWebhook(event, requestUrl, suffix, secret) {
  // https://core.telegram.org/bots/api#setwebhook
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`;
  console.log(`[registerWebhook]url=${webhookUrl}`)
  const r = await (
    await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))
  ).json();
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}

/**
 * Remove webhook
 * https://core.telegram.org/bots/api#setwebhook
 */
async function unRegisterWebhook(event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json();
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}

/**
 * Return url to telegram api, optionally with parameters added
 */
function apiUrl(methodName, params = null) {
  let query = '';
  if (params) {
    query = '?' + new URLSearchParams(params).toString();
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`;
}
