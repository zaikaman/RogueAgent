// backend/create-tweet-fetch.js
// Node 18+ (global fetch). If using older Node install node-fetch and uncomment the import.
// npm i dotenv
require('dotenv').config();
// Uncomment when using node <18:
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function createTweet(text) {
  const url = 'https://api.twitterapi.io/twitter/create_tweet_v2';
  const apiKey = process.env.TWITTERIO_API_KEY || process.env.TWITTER_API_KEY;
  const loginCookies = process.env.TWITTER_LOGIN_COOKIES;
  const proxy = process.env.TWITTER_PROXY;

  if (!apiKey || !loginCookies || !proxy) {
    console.error('Missing env: TWITTERIO_API_KEY, TWITTER_LOGIN_COOKIES, or TWITTER_PROXY');
    process.exit(1);
  }

  const body = {
    login_cookies: loginCookies,
    tweet_text: text,
    proxy: proxy
    // optional: reply_to_tweet_id, attachment_url, community_id, is_note_tweet, media_ids
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      // don't set credentials; provider expects JSON body
    });

    const data = await res.json().catch(() => ({}));
    console.log('HTTP status:', res.status);
    console.log('Response body:', JSON.stringify(data, null, 2));

    if (!res.ok) {
      console.error('Failed to post tweet — check API key, login_cookies, and proxy.');
      process.exit(2);
    }

    if (data.status === 'success') {
      console.log('Tweet posted. id:', data.tweet_id);
    } else {
      console.warn('API returned status:', data.status, 'msg:', data.msg || data.message);
    }

    return data;
  } catch (err) {
    console.error('Request failed:', err.message || err);
    process.exit(3);
  }
}

(async () => {
  const text = process.argv.slice(2).join(' ') || 'VI ANH LA CHAU CUA ONG SANTA YEYE';
  await createTweet(text);
})();