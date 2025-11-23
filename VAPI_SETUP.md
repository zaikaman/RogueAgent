# VAPI Assistant Setup Guide

Complete configuration guide for the Rogue Agent voice assistant on VAPI Dashboard.

**Assistant ID:** `4803aa8d-63c2-402c-87b4-8254b5ed20c9`

---

## 1. Basic Configuration

### Name
```
Rogue Voice Assistant
```

### Model
```
Provider: OpenAI
Model: gpt-4o
```

### Voice
Choose one of the following options:

**Option 1 - Professional & Clear:**
```
Provider: 11Labs
Voice ID: Josh (or equivalent professional male voice)
Stability: 0.5
Similarity Boost: 0.75
```

**Option 2 - Conversational:**
```
Provider: PlayHT
Voice ID: Henry (or equivalent conversational voice)
```

**Option 3 - Engaging:**
```
Provider: Deepgram
Voice: Aura-Asteria-EN
```

---

## 2. System Prompt

Paste the following into the **System Prompt** field:

```
You are Rogue, the voice interface for Rogue Agent - an elite crypto alpha intelligence platform.

**Your Personality:**
- Sharp, confident, and knowledgeable about crypto markets
- Professional yet approachable, like a trusted market advisor
- Speak naturally and conversationally, avoid robotic responses
- Use crypto terminology appropriately but explain complex concepts clearly
- Keep responses concise in voice format (2-3 sentences for simple questions)

**Your Capabilities:**
- You can fetch data from the Rogue Agent database via tools:
  * Recent trading signals
  * Market intelligence reports
  * Yield farming opportunities
  * Airdrop opportunities
- You can search the web and X (Twitter) in real-time for current market data, news, and sentiment
- You can discuss crypto markets, DeFi, trading strategies, and blockchain technology
- You maintain context throughout the conversation

**User Context:**
You are speaking with {{user_name}} who is a {{user_tier}} tier member.

**Response Guidelines:**
1. **Be Conversational**: This is voice, not text. Sound natural, use contractions, vary sentence structure.
2. **Be Concise**: Voice responses should be brief. Aim for 2-3 sentences for simple queries. If providing data, summarize key points.
3. **Use Data Wisely**: When users ask about signals, intel, yields, or airdrops, call the appropriate tool and present the data in a clear, spoken format.
   - Example: "I found 3 recent signals. The top one is a long on SOL with entry at 142, take profit at 160."
4. **Handle Ambiguity**: If unclear, ask a quick clarifying question.
5. **Stay On Topic**: Focus on crypto, trading, and platform-related queries. Politely redirect off-topic questions.
6. **Never Mention Tools**: Don't say "I'm calling a function" or "using a tool". Just naturally present the information.

**Tool Usage:**
- Call `get_recent_signals` when users ask about recent signals, trades, or trading opportunities
- Call `get_recent_intel` when users ask about market news, analysis, or deep dives
- Call `get_yield_opportunities` when users ask about yields, farming, APY, or passive income
- Call `get_airdrops` when users ask about airdrops or upcoming token opportunities
- Call `search_web_and_x` when users ask about current market conditions, live prices, recent news, X sentiment, or anything requiring real-time information
- Only call tools when relevant. Don't fetch data unnecessarily.

**Formatting for Voice:**
- Use natural pauses (periods) instead of long lists
- Say numbers clearly: "142 dollars" not "$142"
- Spell out symbols when needed: "SOL" = "S-O-L" or "Solana"
- For percentages, say "percent": "15 percent APY"

**Example Interactions:**

User: "What are the recent signals?"
Rogue: *calls get_recent_signals* "I've got 3 recent signals. The latest is a long on Solana, entry at 142, take profit at 160, stop loss at 135. Reasoning is strong momentum after network upgrade announcement."

User: "Any good yields right now?"
Rogue: *calls get_yield_opportunities* "Top yield right now is on Arbitrum GMX, offering 18 percent APY with moderate risk. There's also a Curve pool on Ethereum at 12 percent if you prefer lower risk."

User: "Tell me about the market today"
Rogue: *calls search_web_and_x with query="crypto market today bitcoin ethereum"* "Bitcoin is holding above 37K after the ETF news. Ethereum is up 3 percent on the day. Overall market sentiment is cautiously optimistic."

User: "What's the sentiment for Solana on X right now?"
Rogue: *calls search_web_and_x with query="Solana sentiment X Twitter"* "Sentiment for Solana is pretty bullish right now. Lots of talk about the recent network upgrades and growing ecosystem activity. Community is excited about the Jupiter airdrop too."

User: "What's your name?"
Rogue: "I'm Rogue, your crypto intelligence assistant. How can I help you today?"

Remember: You're speaking, not writing. Be natural, be helpful, be Rogue.
```

---

## 3. First Message

Paste the following into the **First Message** field:

```
Hey there! I'm Rogue, your crypto intelligence assistant. What can I help you with today?
```

**Alternative First Messages** (choose one):

```
What's up! Rogue here. Need intel on the markets, signals, or yields?
```

```
Hey! I'm Rogue. Looking for trading signals, market intel, or something else?
```

---

## 4. Tools Configuration

Go to the **Tools** section in the left sidebar and create 5 new tools. For each tool, use the **Dashboard Form** (NOT the JSON editor).

---

### Tool 1: `get_recent_signals`
**Fetches the latest trading signals from the Rogue Agent platform.** Returns recent trade setups with entry points, take profit levels, and stop loss targets. Use this tool when users ask about recent signals, trading opportunities, or what trades are currently active on the platform.

**Dashboard Configuration:**

1. Click **Create Tool** → Select **Function**
2. Fill in the form:
   - **Tool Name**: `get_recent_signals`
   - **Description**: `Get recent trading signals generated by the platform. Use this when the user asks about recent signals or trading opportunities.`
   - **Server URL**: `https://rogue-6a0e7f8c39ad.herokuapp.com/api/vapi/tools/signals`
3. **Parameters** section:
   - Click **Add Parameter**
   - **Name**: `limit`
   - **Type**: `number`
   - **Description**: `Number of signals to fetch (default 5)`
   - **Required**: Leave unchecked
4. Click **Save**

---

### Tool 2: `get_recent_intel`
**Retrieves market intelligence reports and deep-dive analysis from the Rogue Agent team.** Provides curated insights on crypto market trends, token analysis, and macro news. Use this tool when users ask about market analysis, news commentary, or detailed breakdowns of market movements and trends.

**Dashboard Configuration:**

1. Click **Create Tool** → Select **Function**
2. Fill in the form:
   - **Tool Name**: `get_recent_intel`
   - **Description**: `Get recent market intelligence and deep dives. Use this when the user asks about market analysis, news, or deep dives.`
   - **Server URL**: `https://rogue-6a0e7f8c39ad.herokuapp.com/api/vapi/tools/intel`
3. **Parameters** section:
   - Click **Add Parameter**
   - **Name**: `limit`
   - **Type**: `number`
   - **Description**: `Number of intel items to fetch (default 5)`
   - **Required**: Leave unchecked
4. Click **Save**

---

### Tool 3: `get_yield_opportunities`
**Queries top yield farming and liquidity pools across multiple DeFi protocols.** Returns the highest APY opportunities with details on protocol, chain, TVL, and risk assessment. Use this tool when users ask about passive income, yield farming, staking, or where to find the best returns on their capital.

**Dashboard Configuration:**

1. Click **Create Tool** → Select **Function**
2. Fill in the form:
   - **Tool Name**: `get_yield_opportunities`
   - **Description**: `Get top yield farming opportunities. Use this when the user asks about yield, farming, or APY.`
   - **Server URL**: `https://rogue-6a0e7f8c39ad.herokuapp.com/api/vapi/tools/yield`
3. **Parameters** section:
   - Click **Add Parameter**
   - **Name**: `limit`
   - **Type**: `number`
   - **Description**: `Number of opportunities to fetch (default 5)`
   - **Required**: Leave unchecked
4. Click **Save**

---

### Tool 4: `get_airdrops`
**Surfaces promising airdrop opportunities scored by the Rogue Agent team.** Provides information on upcoming token distributions, eligibility requirements, and Rogue's scoring of the opportunity's potential. Use this tool when users ask about airdrops, free token opportunities, or ways to get exposure to new projects.

**Dashboard Configuration:**

1. Click **Create Tool** → Select **Function**
2. Fill in the form:
   - **Tool Name**: `get_airdrops`
   - **Description**: `Get promising airdrop opportunities. Use this when the user asks about airdrops.`
   - **Server URL**: `https://rogue-6a0e7f8c39ad.herokuapp.com/api/vapi/tools/airdrops`
3. **Parameters** section:
   - Click **Add Parameter**
   - **Name**: `limit`
   - **Type**: `number`
   - **Description**: `Number of airdrops to fetch (default 5)`
   - **Required**: Leave unchecked
4. Click **Save**

---

### Tool 5: `search_web_and_x`
**Searches the web and X (Twitter) in real-time for current market information.** Powered by Grok AI with built-in web and X search capabilities. Use this tool when users ask about current prices, breaking news, market sentiment, trending topics, or any real-time information that requires up-to-the-minute data from the internet or social media.

**Dashboard Configuration:**

1. Click **Create Tool** → Select **Function**
2. Fill in the form:
   - **Tool Name**: `search_web_and_x`
   - **Description**: `Search the web and X (Twitter) for real-time market data, news, and sentiment. Use this when the user asks about current prices, breaking news, market conditions, or trending topics.`
   - **Server URL**: `https://rogue-6a0e7f8c39ad.herokuapp.com/api/vapi/tools/search`
3. **Parameters** section:
   - Click **Add Parameter**
   - **Name**: `query`
   - **Type**: `string`
   - **Description**: `The search query or question to find current information about`
   - **Required**: Check this box ✓
4. Click **Save**

---

### Adding Tools to Your Assistant

After creating all 5 tools:

1. Go to **Assistants** → Select your assistant (ID: `4803aa8d-63c2-402c-87b4-8254b5ed20c9`)
2. Navigate to the **Model** section
3. Scroll to **Tools**
4. Click **Add Tool** and select each of your 5 tools from the dropdown:
   - `get_recent_signals`
   - `get_recent_intel`
   - `get_yield_opportunities`
   - `get_airdrops`
   - `search_web_and_x`
5. Click **Save**

---

<Note>
**Alternative: Using JSON (Advanced)**

If you prefer to use the API or JSON configuration, here's the format for Tool 1:</Note>

```json
{
  "type": "function",
  "function": {
    "name": "get_recent_signals",
    "description": "Get recent trading signals generated by the platform. Use this when the user asks about recent signals or trading opportunities.",
    "parameters": {
      "type": "object",
      "properties": {
        "limit": {
          "type": "number",
          "description": "Number of signals to fetch (default 5)"
        }
      },
      "required": []
    }
  },
  "server": {
    "url": "https://rogue-6a0e7f8c39ad.herokuapp.com/api/vapi/tools/signals"
  }
}
```

*(Apply the same pattern for the other 3 tools)*

---

## 5. Additional Settings

### Transcription
```
Provider: Deepgram
Model: nova-2
Language: en-US
```

### End of Call Behavior
```
End Call Message: "Thanks for chatting! Talk soon."
End Call Function: None
```

### Background Sound
```
Enabled: Off (for clearer experience)
```

### Max Duration
```
Max Call Duration: 10 minutes
```

### Silence Detection
```
Timeout After Silence: 30 seconds
Enable Backchannel: On (for more natural conversation)
```

---

## 6. Testing

After configuration:

1. **Test in VAPI Dashboard**: Use the built-in test feature to verify the assistant responds correctly.
2. **Test Voice in Frontend**: Navigate to `/app/ask` in your frontend and click "Start Voice Chat".
3. **Verify Tools Work**: 
   - Ask "What are the recent signals?"
   - Ask "Any good yields?"
   - Ask "Show me airdrops"
   - Confirm data is fetched from your backend.

---

## 7. Variables Reference

The following variables are passed from the frontend:

- `{{user_name}}`: User's wallet address (shortened)
- `{{user_tier}}`: User's membership tier (SILVER, GOLD, DIAMOND)

These are automatically populated when the voice call starts from the frontend.

---

## 8. Troubleshooting

### Tool Calls Failing
- Verify backend is live at `https://rogue-6a0e7f8c39ad.herokuapp.com`
- Check backend logs for errors
- Test endpoints manually:
  ```bash
  curl -X POST https://rogue-6a0e7f8c39ad.herokuapp.com/api/vapi/tools/signals \
    -H "Content-Type: application/json" \
    -d '{"limit": 3}'
  ```

### Voice Not Connecting
- Check VAPI API key in frontend `.env`: `VITE_PUBLIC_VAPI_KEY`
- Verify Assistant ID: `VITE_VAPI_ASSISTANT_ID`
- Check browser console for errors

### Assistant Not Calling Tools
- Review system prompt tool usage instructions
- Ensure tool descriptions are clear
- Test with explicit requests: "Get recent signals"

---

## 9. Optional Enhancements

### Custom Wake Word (Advanced)
If you want users to say "Hey Rogue" to activate, configure:
```
Wake Word: Rogue
Provider: Porcupine
```

### Analytics Integration
Enable call analytics in VAPI dashboard to track:
- Average call duration
- Most used tools
- User satisfaction

### Multilingual Support
Add additional languages in transcription settings if needed.

---

**Setup Complete!** Your Rogue Agent voice assistant is now configured and ready to provide real-time crypto intelligence via voice.
